/**
 * Seeds the database with realistic sample data.
 * Run with: npm run seed
 * WARNING: deletes all existing FeedWise data first.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Supplier from '../models/Supplier.js';
import { calculatePayment, calculateSaleTotals } from '../services/pricingService.js';
import { toStoreDateKey } from '../utils/dates.js';
import * as data from './data.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 45;

// Small deterministic random generator so every seed produces the same data
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const random = createRandom(20261012);
const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function quantityFor(product) {
  if (product.unit === 'kg') return randomInt(2, 10);
  if (product.unit === 'sack') return random() < 0.8 ? 1 : 2;
  if (product.unit === 'can' || product.sku.startsWith('CF-PCH')) return randomInt(2, 8);
  return randomInt(1, 2);
}

// A store-time timestamp: N days ago at a random opening hour (8 AM - 6 PM)
function saleTimestamp(daysAgo) {
  const dayKey = toStoreDateKey(Date.now() - daysAgo * DAY_MS);
  const hour = randomInt(8, 17);
  const minute = randomInt(0, 59);
  const time = new Date(`${dayKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`);
  // Never create sales in the future (e.g. seeding at 9 AM)
  const latest = Date.now() - 5 * 60 * 1000;
  return time.getTime() > latest ? new Date(latest - randomInt(0, 120) * 60 * 1000) : time;
}

async function seed() {
  await connectDB(process.env.MONGO_URI);

  console.log('Clearing existing data...');
  await Promise.all([
    SaleItem.deleteMany({}),
    Sale.deleteMany({}),
    Product.deleteMany({}),
    Customer.deleteMany({}),
    Supplier.deleteMany({}),
    Category.deleteMany({}),
  ]);
  // Make sure unique indexes exist before inserting
  await Promise.all([Category, Supplier, Customer, Product, Sale, SaleItem].map((model) => model.syncIndexes()));

  const categoryDocs = await Category.insertMany(data.categories.map(({ key: _key, ...category }) => category));
  const categoryId = Object.fromEntries(data.categories.map((category, i) => [category.key, categoryDocs[i]._id]));

  const supplierDocs = await Supplier.insertMany(data.suppliers.map(({ key: _key, ...supplier }) => supplier));
  const supplierId = Object.fromEntries(data.suppliers.map((supplier, i) => [supplier.key, supplierDocs[i]._id]));

  const customerDocs = await Customer.insertMany(data.customers);
  const buyingCustomers = customerDocs.slice(0, 8); // last two never buy (deletable)

  const productDocs = await Product.insertMany(
    data.products.map(({ finalStock, expiresInDays, weight: _weight, category, supplier, ...product }) => ({
      ...product,
      category: categoryId[category],
      supplier: supplierId[supplier],
      stock: finalStock,
      expiryDate: expiresInDays === undefined ? null : new Date(Date.now() + expiresInDays * DAY_MS),
    }))
  );
  const sellable = data.products
    .map((product, i) => ({ ...product, doc: productDocs[i] }))
    .filter((product) => product.weight > 0);

  console.log('Generating sales history...');
  const sales = [];
  const saleItems = [];
  let sequence = 0;

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo -= 1) {
    // Weekends are busier
    const weekday = new Date(Date.now() - daysAgo * DAY_MS).getDay();
    const salesToday = weekday === 0 || weekday === 6 ? randomInt(3, 6) : randomInt(1, 4);

    for (let n = 0; n < salesToday; n += 1) {
      const lineCount = randomInt(1, 4);
      const chosen = new Map();
      for (let l = 0; l < lineCount; l += 1) {
        const product = pickWeighted(sellable);
        chosen.set(product.sku, { product, quantity: (chosen.get(product.sku)?.quantity ?? 0) + quantityFor(product) });
      }

      const lines = [...chosen.values()].map(({ product, quantity }) => ({
        product: product.doc._id,
        category: product.doc.category,
        productName: product.doc.name,
        sku: product.doc.sku,
        unit: product.doc.unit,
        unitPrice: product.doc.sellingPrice,
        unitCost: product.doc.costPrice,
        quantity,
      }));

      const customer = random() < 0.65 ? buyingCustomers[randomInt(0, buyingCustomers.length - 1)] : null;
      let discountType = 'none';
      let discountValue = 0;
      if (customer?.customerType === 'wholesale') {
        discountType = 'percent';
        discountValue = 5;
      } else if (random() < 0.12) {
        discountType = 'fixed';
        discountValue = [20, 50, 100][randomInt(0, 2)];
      }

      const totals = calculateSaleTotals(lines, { discountType, discountValue: 0 });
      // Fixed discount can never exceed the subtotal
      if (discountType === 'fixed' && discountValue > totals.subtotal) discountValue = 0;
      const finalTotals = calculateSaleTotals(lines, { discountType, discountValue });

      const paymentRoll = random();
      const paymentMethod = paymentRoll < 0.62 ? 'cash' : paymentRoll < 0.9 ? 'gcash' : 'card';
      const tendered =
        paymentMethod === 'cash' ? Math.ceil(finalTotals.total / 100) * 100 + (random() < 0.3 ? 500 : 0) : undefined;
      const payment = calculatePayment(paymentMethod, finalTotals.total, tendered);

      const createdAt = saleTimestamp(daysAgo);
      sequence += 1;
      const isVoided = sequence % 29 === 0;
      const sale = new Sale({
        saleNumber: `FW-${toStoreDateKey(createdAt).replaceAll('-', '')}-S${String(sequence).padStart(4, '0')}`,
        clientRequestId: `seed-${String(sequence).padStart(6, '0')}`,
        customer: customer?._id ?? null,
        customerName: customer?.name ?? 'Walk-in customer',
        itemCount: finalTotals.itemCount,
        subtotal: finalTotals.subtotal,
        discountType,
        discountValue: discountType === 'none' ? 0 : discountValue,
        discountAmount: finalTotals.discountAmount,
        total: finalTotals.total,
        vatAmount: finalTotals.vatAmount,
        totalCost: finalTotals.totalCost,
        grossProfit: finalTotals.grossProfit,
        paymentMethod,
        amountTendered: payment.amountTendered,
        change: payment.change,
        status: isVoided ? 'voided' : 'completed',
        voidedAt: isVoided ? new Date(createdAt.getTime() + 20 * 60 * 1000) : null,
        voidReason: isVoided ? 'Customer cancelled order' : '',
        createdAt,
        updatedAt: createdAt,
      });
      await sale.validate();
      sales.push(sale.toObject());

      for (const line of finalTotals.lines) {
        const item = new SaleItem({ ...line, sale: sale._id, createdAt, updatedAt: createdAt });
        await item.validate();
        saleItems.push(item.toObject());
      }
    }
  }

  // Raw driver insert keeps our historical createdAt values (Mongoose would set "now")
  await Sale.collection.insertMany(sales);
  await SaleItem.collection.insertMany(saleItems);

  console.log('-----------------------------------------');
  console.log(`Categories : ${categoryDocs.length}`);
  console.log(`Suppliers  : ${supplierDocs.length}`);
  console.log(`Customers  : ${customerDocs.length}`);
  console.log(`Products   : ${productDocs.length}`);
  console.log(`Sales      : ${sales.length} (${sales.filter((s) => s.status === 'voided').length} voided)`);
  console.log(`Sale items : ${saleItems.length}`);
  console.log('-----------------------------------------');
  console.log('Seed complete.');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
