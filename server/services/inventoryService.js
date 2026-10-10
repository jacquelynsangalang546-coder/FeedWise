import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import { round2 } from '../utils/money.js';
import { daysBetween } from '../utils/dates.js';

export const NEAR_EXPIRY_DAYS = 30;

export function getStockStatus(product) {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.reorderLevel) return 'low';
  return 'ok';
}

// How many units to order to get back to a healthy level (2x the reorder level).
export function suggestedReorderQuantity(product) {
  const target = Math.max(product.reorderLevel * 2, 1);
  return Math.max(target - product.stock, 0);
}

// "expired" | "near-expiry" | "ok" | null (no expiry date)
export function getExpiryStatus(product, now = new Date()) {
  if (!product.expiryDate) return null;
  const daysLeft = daysBetween(now, product.expiryDate);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= NEAR_EXPIRY_DAYS) return 'near-expiry';
  return 'ok';
}

/**
 * Checks whether every requested quantity can be served from current stock.
 * items: [{ productId, quantity }]  (already validated + merged)
 * Returns one result per item and whether the whole cart can be completed.
 */
export async function checkAvailability(items) {
  const ids = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const results = items.map((item) => {
    const product = byId.get(String(item.productId));
    if (!product) {
      return {
        productId: item.productId,
        found: false,
        requested: item.quantity,
        available: 0,
        sufficient: false,
        shortage: item.quantity,
        reason: 'Product not found',
      };
    }
    const available = product.isActive ? product.stock : 0;
    const sufficient = product.isActive && product.stock >= item.quantity;
    let reason = null;
    if (!product.isActive) reason = 'Product is archived and cannot be sold';
    else if (!sufficient) reason = `Only ${product.stock} ${product.unit}(s) left`;
    return {
      productId: String(product._id),
      found: true,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      unitPrice: product.sellingPrice,
      requested: item.quantity,
      available,
      remainingAfterSale: sufficient ? product.stock - item.quantity : product.stock,
      sufficient,
      shortage: sufficient ? 0 : item.quantity - available,
      willBeLowStock: sufficient && product.stock - item.quantity <= product.reorderLevel,
      reason,
    };
  });

  return {
    allAvailable: results.every((result) => result.sufficient),
    items: results,
    products: byId,
  };
}

/** Products at or below their reorder level, most urgent first. */
export async function findLowStockProducts() {
  const products = await Product.find({ isActive: true })
    .populate('category', 'name color')
    .populate('supplier', 'name phone leadTimeDays');

  return products
    .filter((product) => product.stock <= product.reorderLevel)
    .map((product) => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      category: product.category,
      supplier: product.supplier,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      stockStatus: getStockStatus(product),
      // 0 = empty, 1 = exactly at reorder level
      stockRatio: product.reorderLevel > 0 ? round2(product.stock / product.reorderLevel) : 0,
      suggestedReorderQty: suggestedReorderQuantity(product),
      estimatedReorderCost: round2(suggestedReorderQuantity(product) * product.costPrice),
    }))
    .sort((a, b) => a.stockRatio - b.stockRatio || a.stock - b.stock);
}

/** Adds or removes stock manually (delivery received, damaged goods...). */
export async function adjustStock(productId, adjustment, reason) {
  if (!Number.isInteger(adjustment) || adjustment === 0) {
    throw ApiError.badRequest('Adjustment must be a non-zero whole number', {
      errors: { adjustment: 'Use a positive number to add stock or a negative number to remove stock' },
    });
  }
  if (Math.abs(adjustment) > 100_000) {
    throw ApiError.badRequest('Adjustment is too large', { errors: { adjustment: 'Maximum is 100,000 units' } });
  }
  if (typeof reason !== 'string' || reason.trim().length < 3) {
    throw ApiError.badRequest('A reason is required', { errors: { reason: 'Reason must be at least 3 characters' } });
  }

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  // Atomic conditional update: only succeeds if the stock will not go below zero.
  const filter = adjustment < 0 ? { _id: productId, stock: { $gte: -adjustment } } : { _id: productId };
  const updated = await Product.findOneAndUpdate(filter, { $inc: { stock: adjustment } }, { new: true })
    .populate('category', 'name color')
    .populate('supplier', 'name');

  if (!updated) {
    throw ApiError.badRequest(`Cannot remove ${-adjustment} units - only ${product.stock} in stock`, {
      errors: { adjustment: `Stock cannot go below zero (current stock: ${product.stock})` },
    });
  }
  return { product: updated, previousStock: product.stock, adjustment, reason: reason.trim() };
}
