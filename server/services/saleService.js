import crypto from 'node:crypto';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import ApiError from '../utils/ApiError.js';
import { toStoreDateKey } from '../utils/dates.js';
import { runAtomic } from '../utils/transaction.js';
import { checkAvailability } from './inventoryService.js';
import { calculatePayment, calculateSaleTotals, normalizeSaleInput } from './pricingService.js';

function generateSaleNumber() {
  const day = toStoreDateKey(new Date()).replaceAll('-', '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FW-${day}-${suffix}`;
}

async function findCustomer(customerId) {
  if (!customerId) return null;
  const customer = await Customer.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

function throwIfUnavailable(availability) {
  const missing = availability.items.find((item) => !item.found);
  if (missing) throw ApiError.notFound(`Product ${missing.productId} not found`);

  if (!availability.allAvailable) {
    const shortages = availability.items.filter((item) => !item.sufficient);
    throw ApiError.badRequest('Insufficient stock for one or more products', {
      details: shortages.map((item) => ({
        productId: item.productId,
        name: item.name,
        requested: item.requested,
        available: item.available,
        reason: item.reason,
      })),
    });
  }
}

// Builds the priced lines using CURRENT database prices (client prices are never trusted).
function buildLines(items, productsById) {
  return items.map((item) => {
    const product = productsById.get(String(item.productId));
    return {
      product: product._id,
      category: product.category,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      unitPrice: product.sellingPrice,
      unitCost: product.costPrice,
      quantity: item.quantity,
    };
  });
}

/**
 * POST /api/sales/preview
 * Computes totals and checks stock WITHOUT saving anything.
 */
export async function previewSale(body) {
  const input = normalizeSaleInput(body, { requireRequestId: false });
  const customer = await findCustomer(input.customer);
  const availability = await checkAvailability(input.items);

  const missing = availability.items.find((item) => !item.found);
  if (missing) throw ApiError.notFound(`Product ${missing.productId} not found`);

  const lines = buildLines(input.items, availability.products);
  const totals = calculateSaleTotals(lines, input);

  let payment = null;
  let paymentError = null;
  try {
    payment = calculatePayment(input.paymentMethod, totals.total, input.amountTendered);
  } catch (error) {
    paymentError = error.errors?.amountTendered ?? error.message;
  }

  const { products: _ignored, ...availabilityResult } = availability;
  return {
    customerName: customer?.name ?? 'Walk-in customer',
    discountType: input.discountType,
    discountValue: input.discountValue,
    paymentMethod: input.paymentMethod,
    ...totals,
    lines: totals.lines.map(({ unitCost: _cost, lineCost: _lineCost, ...line }) => line),
    payment,
    paymentError,
    availability: availabilityResult,
    canComplete: availability.allAvailable && !paymentError,
  };
}

/**
 * POST /api/sales
 * 1. Validate input and reject duplicates (same clientRequestId)
 * 2. Check stock availability for every line
 * 3. Compute subtotal, discount, VAT, total, profit and change
 * 4. Atomically: deduct stock, save the sale and its items
 *    (any failure rolls everything back)
 */
export async function createSale(body) {
  const input = normalizeSaleInput(body);

  const existing = await Sale.findOne({ clientRequestId: input.clientRequestId }).select('_id saleNumber');
  if (existing) {
    throw ApiError.conflict('This sale was already processed', {
      details: { saleId: existing._id, saleNumber: existing.saleNumber },
    });
  }

  const customer = await findCustomer(input.customer);
  const availability = await checkAvailability(input.items);
  throwIfUnavailable(availability);

  const lines = buildLines(input.items, availability.products);
  const totals = calculateSaleTotals(lines, input);
  const payment = calculatePayment(input.paymentMethod, totals.total, input.amountTendered);

  try {
    const saleId = await runAtomic(async ({ opts, onRollback }) => {
      // Deduct stock. The filter "stock >= quantity" makes each update atomic:
      // if another cashier sold the last units a moment ago, this update matches
      // nothing and the whole sale is rolled back instead of going negative.
      for (const line of lines) {
        const updated = await Product.findOneAndUpdate(
          { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity } },
          { ...opts, new: true }
        );
        if (!updated) {
          throw ApiError.badRequest(`Not enough stock for ${line.productName}. It may have just been sold.`);
        }
        onRollback(() => Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity } }));
      }

      const [sale] = await Sale.create(
        [
          {
            saleNumber: generateSaleNumber(),
            clientRequestId: input.clientRequestId,
            customer: customer?._id ?? null,
            customerName: customer?.name ?? 'Walk-in customer',
            itemCount: totals.itemCount,
            subtotal: totals.subtotal,
            discountType: input.discountType,
            discountValue: input.discountValue,
            discountAmount: totals.discountAmount,
            total: totals.total,
            vatAmount: totals.vatAmount,
            totalCost: totals.totalCost,
            grossProfit: totals.grossProfit,
            paymentMethod: input.paymentMethod,
            amountTendered: payment.amountTendered,
            change: payment.change,
            notes: input.notes,
          },
        ],
        opts
      );
      onRollback(() => Sale.deleteOne({ _id: sale._id }));

      onRollback(() => SaleItem.deleteMany({ sale: sale._id }));
      await SaleItem.insertMany(
        totals.lines.map((line) => ({ ...line, sale: sale._id })),
        opts
      );

      return sale._id;
    });

    return getSaleWithItems(saleId);
  } catch (error) {
    // Two identical requests arriving at the same instant: the unique index wins.
    if (error?.code === 11000 && (error.keyPattern?.clientRequestId || error.keyValue?.clientRequestId)) {
      throw ApiError.conflict('This sale was already processed');
    }
    throw error;
  }
}

/**
 * PATCH /api/sales/:id/void
 * Status rule: only a "completed" sale can become "voided". Stock is returned.
 */
export async function voidSale(saleId, reason) {
  if (typeof reason !== 'string' || reason.trim().length < 3) {
    throw ApiError.badRequest('A void reason is required', { errors: { reason: 'Reason must be at least 3 characters' } });
  }

  const sale = await Sale.findById(saleId);
  if (!sale) throw ApiError.notFound('Sale not found');
  if (sale.status !== 'completed') {
    throw ApiError.badRequest(`Sale ${sale.saleNumber} is already ${sale.status} and cannot be voided again`);
  }

  const items = await SaleItem.find({ sale: sale._id });

  await runAtomic(async ({ opts, onRollback }) => {
    // Only flip status if it is still "completed" (prevents double-void races)
    const flipped = await Sale.findOneAndUpdate(
      { _id: sale._id, status: 'completed' },
      { status: 'voided', voidedAt: new Date(), voidReason: reason.trim() },
      { ...opts, new: true }
    );
    if (!flipped) throw ApiError.badRequest('Sale was already voided');
    onRollback(() =>
      Sale.updateOne({ _id: sale._id }, { status: 'completed', voidedAt: null, voidReason: '' })
    );

    for (const item of items) {
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, opts);
      onRollback(() => Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } }));
    }
  });

  return getSaleWithItems(sale._id);
}

export async function getSaleWithItems(saleId) {
  const sale = await Sale.findById(saleId).populate('customer', 'name phone customerType');
  if (!sale) throw ApiError.notFound('Sale not found');
  const items = await SaleItem.find({ sale: sale._id }).sort({ createdAt: 1, _id: 1 });
  return { ...sale.toObject(), items };
}
