import mongoose from 'mongoose';
import { DISCOUNT_TYPES, PAYMENT_METHODS } from '../models/Sale.js';
import ApiError from '../utils/ApiError.js';
import { fromCents, toCents } from '../utils/money.js';

// ---- Store policies (business rules) ----
export const MAX_PERCENT_DISCOUNT = 50; // a cashier may give at most 50% off
export const MAX_QUANTITY_PER_LINE = 1000;
export const MAX_ITEMS_PER_SALE = 50;
export const VAT_RATE = 0.12; // Philippine VAT; shelf prices are VAT-inclusive

/**
 * Validates and normalizes the body of a sale / sale preview request.
 * Collects every problem into one "errors" object so the cashier sees them all at once.
 * Duplicate product lines are merged (2 + 3 of the same SKU -> 5).
 */
export function normalizeSaleInput(body = {}, { requireRequestId = true } = {}) {
  const errors = {};
  const { items, discountType = 'none', discountValue = 0, paymentMethod, amountTendered, customer, notes = '' } = body;

  // Items
  const merged = new Map();
  if (!Array.isArray(items) || items.length === 0) {
    errors.items = 'Add at least one product to the sale';
  } else if (items.length > MAX_ITEMS_PER_SALE) {
    errors.items = `A sale can contain at most ${MAX_ITEMS_PER_SALE} lines`;
  } else {
    items.forEach((item, index) => {
      const productId = item?.productId;
      const quantity = item?.quantity;
      if (!mongoose.isValidObjectId(productId)) {
        errors[`items.${index}.productId`] = 'Invalid product ID';
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        errors[`items.${index}.quantity`] = 'Quantity must be a whole number of at least 1';
        return;
      }
      const key = String(productId);
      merged.set(key, (merged.get(key) ?? 0) + quantity);
      if (merged.get(key) > MAX_QUANTITY_PER_LINE) {
        errors[`items.${index}.quantity`] = `Quantity per product cannot exceed ${MAX_QUANTITY_PER_LINE}`;
      }
    });
  }

  // Discount
  if (!DISCOUNT_TYPES.includes(discountType)) {
    errors.discountType = `Discount type must be one of: ${DISCOUNT_TYPES.join(', ')}`;
  }
  const discountNumber = Number(discountValue);
  if (typeof discountValue !== 'number' || !Number.isFinite(discountNumber) || discountNumber < 0) {
    errors.discountValue = 'Discount must be a number of 0 or more';
  } else if (discountType === 'percent' && discountNumber > MAX_PERCENT_DISCOUNT) {
    errors.discountValue = `Percent discount cannot exceed ${MAX_PERCENT_DISCOUNT}%`;
  }

  // Payment
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    errors.paymentMethod = `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`;
  }
  if (paymentMethod === 'cash' && amountTendered !== undefined && amountTendered !== null) {
    if (typeof amountTendered !== 'number' || !Number.isFinite(amountTendered) || amountTendered < 0) {
      errors.amountTendered = 'Amount tendered must be a positive number';
    }
  }

  // Customer is optional (walk-in sale)
  if (customer && !mongoose.isValidObjectId(customer)) {
    errors.customer = 'Invalid customer ID';
  }

  if (typeof notes !== 'string' || notes.length > 200) {
    errors.notes = 'Notes must be text of at most 200 characters';
  }

  const clientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId.trim() : '';
  if (requireRequestId && (clientRequestId.length < 8 || clientRequestId.length > 64)) {
    errors.clientRequestId = 'A valid clientRequestId (8-64 characters) is required';
  }

  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('Sale request is invalid', { errors });
  }

  return {
    items: [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity })),
    discountType,
    discountValue: discountType === 'none' ? 0 : discountNumber,
    paymentMethod,
    amountTendered: paymentMethod === 'cash' ? amountTendered : undefined,
    customer: customer || null,
    notes: notes.trim(),
    clientRequestId,
  };
}

/**
 * Computes every money figure of a sale from line items.
 * lines: [{ unitPrice, unitCost, quantity }]
 * All math is in centavos, then converted back to pesos.
 */
export function calculateSaleTotals(lines, { discountType = 'none', discountValue = 0 } = {}) {
  const lineResults = lines.map((line) => ({
    ...line,
    lineTotal: fromCents(toCents(line.unitPrice) * line.quantity),
    lineCost: fromCents(toCents(line.unitCost ?? 0) * line.quantity),
  }));

  const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0);
  const totalCostCents = lines.reduce((sum, line) => sum + toCents(line.unitCost ?? 0) * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  let discountCents = 0;
  if (discountType === 'percent') {
    if (discountValue < 0 || discountValue > MAX_PERCENT_DISCOUNT) {
      throw ApiError.badRequest(`Percent discount must be between 0 and ${MAX_PERCENT_DISCOUNT}`);
    }
    discountCents = Math.round((subtotalCents * discountValue) / 100);
  } else if (discountType === 'fixed') {
    discountCents = toCents(discountValue);
    if (discountCents > subtotalCents) {
      throw ApiError.badRequest('Discount cannot be greater than the subtotal', {
        errors: { discountValue: `Maximum fixed discount for this sale is ₱${fromCents(subtotalCents).toFixed(2)}` },
      });
    }
  }

  const totalCents = subtotalCents - discountCents;
  // VAT-inclusive: VAT portion = total - total / 1.12
  const vatCents = Math.round(totalCents - totalCents / (1 + VAT_RATE));

  return {
    lines: lineResults,
    itemCount,
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(discountCents),
    total: fromCents(totalCents),
    vatAmount: fromCents(vatCents),
    totalCost: fromCents(totalCostCents),
    grossProfit: fromCents(totalCents - totalCostCents),
  };
}

/**
 * Cash: tendered must cover the total and change is computed.
 * GCash / card: the exact total is charged, so no change.
 */
export function calculatePayment(paymentMethod, total, amountTendered) {
  if (paymentMethod !== 'cash') {
    return { amountTendered: total, change: 0 };
  }
  const tendered = amountTendered ?? total;
  if (toCents(tendered) < toCents(total)) {
    throw ApiError.badRequest('Amount tendered is less than the total', {
      errors: { amountTendered: `Customer must pay at least ₱${total.toFixed(2)}` },
    });
  }
  return { amountTendered: tendered, change: fromCents(toCents(tendered) - toCents(total)) };
}
