import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Sale, { PAYMENT_METHODS } from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import ApiError from '../utils/ApiError.js';
import {
  dateKeysBetween,
  endOfStoreDay,
  isValidDateString,
  startOfStoreDay,
  storeDateKeyFromToday,
  toStoreDateKey,
} from '../utils/dates.js';
import { fromCents, round2, toCents } from '../utils/money.js';
import { findLowStockProducts, getExpiryStatus, getStockStatus, NEAR_EXPIRY_DAYS } from './inventoryService.js';

const MAX_RANGE_DAYS = 366;

const sumMoney = (values) => fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const percentChange = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;

/** Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD (store time). Defaults to the last `defaultDays` days. */
export function parseDateRange(query = {}, defaultDays = 30) {
  const toKey = query.to ?? storeDateKeyFromToday(0);
  const fromKey = query.from ?? storeDateKeyFromToday(-(defaultDays - 1));
  const errors = {};
  if (!isValidDateString(fromKey)) errors.from = 'Use the format YYYY-MM-DD';
  if (!isValidDateString(toKey)) errors.to = 'Use the format YYYY-MM-DD';
  if (Object.keys(errors).length) throw ApiError.badRequest('Invalid date range', { errors });

  const start = startOfStoreDay(fromKey);
  const end = endOfStoreDay(toKey);
  if (start > end) throw ApiError.badRequest('"from" date must be on or before "to" date');
  const days = dateKeysBetween(fromKey, toKey).length;
  if (days > MAX_RANGE_DAYS) throw ApiError.badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);

  return { fromKey, toKey, start, end, days };
}

async function completedSaleIds(start, end) {
  const sales = await Sale.find({ status: 'completed', createdAt: { $gte: start, $lte: end } }).select('_id');
  return sales.map((sale) => sale._id);
}

/**
 * Groups sale items by a key (product or category) and totals them.
 * Money is summed in centavos to stay exact.
 */
function groupItems(items, getKey, getInfo = () => ({})) {
  const groups = new Map();
  for (const item of items) {
    const key = String(getKey(item));
    const group = groups.get(key) ?? { _id: getKey(item), quantity: 0, revenueCents: 0, costCents: 0, orders: 0 };
    group.quantity += item.quantity;
    group.revenueCents += toCents(item.lineTotal);
    group.costCents += toCents(item.lineCost);
    group.orders += 1;
    Object.assign(group, getInfo(item)); // latest name/sku snapshot
    groups.set(key, group);
  }
  return [...groups.values()].map(({ revenueCents, costCents, ...group }) => ({
    ...group,
    revenue: fromCents(revenueCents),
    cost: fromCents(costCents),
  }));
}

/** Groups completed sales by store day, zero-filling days without sales. */
function buildDailySeries(sales, fromKey, toKey) {
  const buckets = new Map(dateKeysBetween(fromKey, toKey).map((key) => [key, { revenue: 0, profit: 0, count: 0 }]));
  for (const sale of sales) {
    const bucket = buckets.get(toStoreDateKey(sale.createdAt));
    if (!bucket) continue;
    bucket.revenue += toCents(sale.total);
    bucket.profit += toCents(sale.grossProfit);
    bucket.count += 1;
  }
  return [...buckets.entries()].map(([date, bucket]) => ({
    date,
    revenue: fromCents(bucket.revenue),
    profit: fromCents(bucket.profit),
    salesCount: bucket.count,
  }));
}

/**
 * GET /api/reports/top-products
 * Ranks products by quantity sold or revenue among COMPLETED sales in the range.
 */
export async function getTopProducts({ start, end }, { limit = 10, sortBy = 'quantity' } = {}) {
  if (!['quantity', 'revenue', 'profit'].includes(sortBy)) {
    throw ApiError.badRequest('sortBy must be quantity, revenue or profit');
  }
  const saleIds = await completedSaleIds(start, end);
  if (saleIds.length === 0) return { totalRevenue: 0, products: [] };

  const items = await SaleItem.find({ sale: { $in: saleIds } }).select(
    'product productName sku unit quantity lineTotal lineCost'
  );
  const grouped = groupItems(items, (item) => item.product, (item) => ({
    productName: item.productName,
    sku: item.sku,
    unit: item.unit,
  }));

  const totalRevenue = sumMoney(grouped.map((row) => row.revenue));
  const ranked = grouped
    .map((row) => ({
      productId: row._id,
      productName: row.productName,
      sku: row.sku,
      unit: row.unit,
      quantitySold: row.quantity,
      orders: row.orders,
      revenue: round2(row.revenue),
      profit: round2(row.revenue - row.cost),
      marginPercent: percent(row.revenue - row.cost, row.revenue),
      revenueShare: percent(row.revenue, totalRevenue),
    }))
    .sort((a, b) => {
      const key = sortBy === 'quantity' ? 'quantitySold' : sortBy;
      return b[key] - a[key] || b.revenue - a.revenue || a.productName.localeCompare(b.productName);
    })
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));

  // Attach current stock so the store can see if a best-seller is running out
  const products = await Product.find({ _id: { $in: ranked.map((row) => row.productId) } }).select(
    'stock reorderLevel'
  );
  const stockById = new Map(products.map((product) => [String(product._id), product]));
  return {
    totalRevenue,
    products: ranked.map((row) => {
      const product = stockById.get(String(row.productId));
      return {
        ...row,
        currentStock: product?.stock ?? null,
        stockStatus: product ? getStockStatus(product) : null,
      };
    }),
  };
}

/**
 * GET /api/reports/sales-summary
 * Count, revenue, average, highest/lowest sale, daily trend and payment distribution.
 */
export async function getSalesSummary(range) {
  const { start, end, fromKey, toKey } = range;
  const [sales, voided] = await Promise.all([
    Sale.find({ status: 'completed', createdAt: { $gte: start, $lte: end } })
      .select('saleNumber total subtotal discountAmount grossProfit itemCount paymentMethod createdAt customerName')
      .sort({ createdAt: 1 }),
    Sale.find({ status: 'voided', createdAt: { $gte: start, $lte: end } }).select('total'),
  ]);

  const revenue = sumMoney(sales.map((sale) => sale.total));
  const grossProfit = sumMoney(sales.map((sale) => sale.grossProfit));
  const count = sales.length;

  let highest = null;
  let lowest = null;
  for (const sale of sales) {
    if (!highest || sale.total > highest.total) highest = sale;
    if (!lowest || sale.total < lowest.total) lowest = sale;
  }
  const pickSale = (sale) =>
    sale && { _id: sale._id, saleNumber: sale.saleNumber, total: sale.total, customerName: sale.customerName, createdAt: sale.createdAt };

  const daily = buildDailySeries(sales, fromKey, toKey);
  const bestDay = daily.reduce((best, day) => (!best || day.revenue > best.revenue ? day : best), null);

  const paymentBreakdown = PAYMENT_METHODS.map((method) => {
    const matching = sales.filter((sale) => sale.paymentMethod === method);
    const amount = sumMoney(matching.map((sale) => sale.total));
    return { method, count: matching.length, amount, share: percent(amount, revenue) };
  });

  return {
    range: { from: fromKey, to: toKey, days: daily.length },
    salesCount: count,
    revenue,
    grossProfit,
    profitMargin: percent(grossProfit, revenue),
    totalDiscounts: sumMoney(sales.map((sale) => sale.discountAmount)),
    itemsSold: sales.reduce((sum, sale) => sum + sale.itemCount, 0),
    averageSale: count ? round2(revenue / count) : 0,
    averageDailyRevenue: daily.length ? round2(revenue / daily.length) : 0,
    highestSale: pickSale(highest),
    lowestSale: pickSale(lowest),
    bestDay: bestDay && bestDay.revenue > 0 ? bestDay : null,
    voidedCount: voided.length,
    voidedAmount: sumMoney(voided.map((sale) => sale.total)),
    paymentBreakdown,
    daily,
  };
}

/**
 * GET /api/reports/category-sales
 * Revenue and units per category for completed sales in the range.
 */
export async function getCategorySales({ start, end }) {
  const saleIds = await completedSaleIds(start, end);
  if (saleIds.length === 0) return { totalRevenue: 0, categories: [] };

  const items = await SaleItem.find({ sale: { $in: saleIds } }).select('category quantity lineTotal lineCost');
  const grouped = groupItems(items, (item) => item.category);

  const categories = await Category.find({ _id: { $in: grouped.map((row) => row._id) } }).select('name color');
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const totalRevenue = sumMoney(grouped.map((row) => row.revenue));

  return {
    totalRevenue,
    categories: grouped
      .map((row) => ({
        categoryId: row._id,
        name: byId.get(String(row._id))?.name ?? 'Deleted category',
        color: byId.get(String(row._id))?.color ?? 'slate',
        revenue: round2(row.revenue),
        profit: round2(row.revenue - row.cost),
        units: row.quantity,
        share: percent(row.revenue, totalRevenue),
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

/**
 * GET /api/reports/inventory
 * Stock valuation, stock status distribution, per-category totals, expiry alerts.
 */
export async function getInventoryReport() {
  const products = await Product.find({ isActive: true })
    .populate('category', 'name color')
    .sort({ name: 1 });

  const statusCounts = { ok: 0, low: 0, out: 0 };
  const categoryTotals = new Map();
  const expiryAlerts = [];
  let costValueCents = 0;
  let retailValueCents = 0;
  let totalUnits = 0;

  for (const product of products) {
    const status = getStockStatus(product);
    statusCounts[status] += 1;
    const cost = toCents(product.costPrice) * product.stock;
    const retail = toCents(product.sellingPrice) * product.stock;
    costValueCents += cost;
    retailValueCents += retail;
    totalUnits += product.stock;

    const key = String(product.category?._id ?? 'none');
    const bucket = categoryTotals.get(key) ?? {
      categoryId: product.category?._id ?? null,
      name: product.category?.name ?? 'Uncategorized',
      color: product.category?.color ?? 'slate',
      productCount: 0,
      units: 0,
      costValue: 0,
      retailValue: 0,
      lowStockCount: 0,
    };
    bucket.productCount += 1;
    bucket.units += product.stock;
    bucket.costValue += cost;
    bucket.retailValue += retail;
    if (status !== 'ok') bucket.lowStockCount += 1;
    categoryTotals.set(key, bucket);

    const expiryStatus = getExpiryStatus(product);
    if (expiryStatus === 'expired' || expiryStatus === 'near-expiry') {
      expiryAlerts.push({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        expiryDate: product.expiryDate,
        expiryStatus,
        daysLeft: Math.ceil((new Date(product.expiryDate).getTime() - Date.now()) / 86_400_000),
      });
    }
  }

  return {
    productCount: products.length,
    totalUnits,
    costValue: fromCents(costValueCents),
    retailValue: fromCents(retailValueCents),
    potentialProfit: fromCents(retailValueCents - costValueCents),
    statusCounts,
    nearExpiryDays: NEAR_EXPIRY_DAYS,
    categories: [...categoryTotals.values()]
      .map((bucket) => ({
        ...bucket,
        costValue: fromCents(bucket.costValue),
        retailValue: fromCents(bucket.retailValue),
        valueShare: percent(bucket.retailValue, retailValueCents),
      }))
      .sort((a, b) => b.retailValue - a.retailValue),
    expiryAlerts: expiryAlerts.sort((a, b) => a.daysLeft - b.daysLeft),
    lowStock: await findLowStockProducts(),
  };
}

/**
 * GET /api/reports/dashboard
 * Everything the dashboard needs in one request.
 */
export async function getDashboard() {
  const todayKey = storeDateKeyFromToday(0);
  const yesterdayKey = storeDateKeyFromToday(-1);
  const monthStartKey = `${todayKey.slice(0, 8)}01`;
  const weekStartKey = storeDateKeyFromToday(-6);
  const earliestKey = monthStartKey < weekStartKey ? monthStartKey : weekStartKey;

  const [sales, recentSales, products] = await Promise.all([
    Sale.find({ status: 'completed', createdAt: { $gte: startOfStoreDay(earliestKey) } }).select(
      'total grossProfit itemCount createdAt'
    ),
    Sale.find().sort({ createdAt: -1 }).limit(6).select('saleNumber customerName total status paymentMethod itemCount createdAt'),
    Product.find({ isActive: true }).select('stock reorderLevel costPrice sellingPrice expiryDate'),
  ]);

  const salesOn = (key) => sales.filter((sale) => toStoreDateKey(sale.createdAt) === key);
  const today = salesOn(todayKey);
  const yesterday = salesOn(yesterdayKey);
  const month = sales.filter((sale) => toStoreDateKey(sale.createdAt) >= monthStartKey);

  const todayRevenue = sumMoney(today.map((sale) => sale.total));
  const yesterdayRevenue = sumMoney(yesterday.map((sale) => sale.total));
  const monthRevenue = sumMoney(month.map((sale) => sale.total));

  const stockCounts = { ok: 0, low: 0, out: 0 };
  let inventoryValueCents = 0;
  let nearExpiry = 0;
  for (const product of products) {
    stockCounts[getStockStatus(product)] += 1;
    inventoryValueCents += toCents(product.costPrice) * product.stock;
    const expiry = getExpiryStatus(product);
    if (expiry === 'expired' || expiry === 'near-expiry') nearExpiry += 1;
  }

  const top = await getTopProducts(
    { start: startOfStoreDay(storeDateKeyFromToday(-29)), end: endOfStoreDay(todayKey) },
    { limit: 5, sortBy: 'quantity' }
  );

  return {
    today: {
      date: todayKey,
      revenue: todayRevenue,
      salesCount: today.length,
      itemsSold: today.reduce((sum, sale) => sum + sale.itemCount, 0),
      changeVsYesterday: percentChange(todayRevenue, yesterdayRevenue),
    },
    month: {
      revenue: monthRevenue,
      grossProfit: sumMoney(month.map((sale) => sale.grossProfit)),
      salesCount: month.length,
      averageSale: month.length ? round2(monthRevenue / month.length) : 0,
    },
    inventory: {
      activeProducts: products.length,
      lowStock: stockCounts.low,
      outOfStock: stockCounts.out,
      healthy: stockCounts.ok,
      nearExpiry,
      valueAtCost: fromCents(inventoryValueCents),
    },
    last7Days: buildDailySeries(sales, weekStartKey, todayKey),
    topProducts: top.products,
    recentSales,
  };
}
