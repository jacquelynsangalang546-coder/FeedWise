import mongoose from 'mongoose';
import Sale, { PAYMENT_METHODS, SALE_STATUSES } from '../models/Sale.js';
import ApiError from '../utils/ApiError.js';
import { endOfStoreDay, isValidDateString, startOfStoreDay } from '../utils/dates.js';
import { escapeRegex } from '../utils/request.js';
import { createSale, getSaleWithItems, previewSale, voidSale } from '../services/saleService.js';
import { fromCents, toCents } from '../utils/money.js';

/**
 * GET /api/sales
 * Filters: ?search=&status=&paymentMethod=&customer=&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=
 */
export async function listSales(req, res) {
  const { search, status, paymentMethod, customer, from, to } = req.query;
  const filter = {};

  if (status) {
    if (!SALE_STATUSES.includes(status)) throw ApiError.badRequest(`status must be one of: ${SALE_STATUSES.join(', ')}`);
    filter.status = status;
  }
  if (paymentMethod) {
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw ApiError.badRequest(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }
    filter.paymentMethod = paymentMethod;
  }
  if (customer) {
    if (!mongoose.isValidObjectId(customer)) throw ApiError.badRequest('Invalid customer ID');
    filter.customer = customer;
  }
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ saleNumber: pattern }, { customerName: pattern }];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      if (!isValidDateString(from)) throw ApiError.badRequest('from must be a date in YYYY-MM-DD format');
      filter.createdAt.$gte = startOfStoreDay(from);
    }
    if (to) {
      if (!isValidDateString(to)) throw ApiError.badRequest('to must be a date in YYYY-MM-DD format');
      filter.createdAt.$lte = endOfStoreDay(to);
    }
    if (from && to && from > to) throw ApiError.badRequest('"from" date must be on or before "to" date');
  }

  const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? '200', 10) || 200, 1), 500);
  const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(limit);

  const completed = sales.filter((sale) => sale.status === 'completed');
  res.status(200).json({
    data: sales,
    meta: {
      count: sales.length,
      completedCount: completed.length,
      totalRevenue: fromCents(completed.reduce((sum, sale) => sum + toCents(sale.total), 0)),
    },
  });
}

// GET /api/sales/:id  (sale + its line items)
export async function getSale(req, res) {
  const data = await getSaleWithItems(req.params.id);
  res.status(200).json({ data });
}

// POST /api/sales/preview  (computes totals + stock check, saves nothing)
export async function previewSaleTotals(req, res) {
  const data = await previewSale(req.body);
  res.status(200).json({ data });
}

// POST /api/sales  (checkout: validates, deducts stock, saves sale atomically)
export async function createNewSale(req, res) {
  const data = await createSale(req.body);
  res.status(201).json({ message: `Sale ${data.saleNumber} completed`, data });
}

// PATCH /api/sales/:id/void   body: { reason }
export async function voidExistingSale(req, res) {
  const data = await voidSale(req.params.id, req.body?.reason);
  res.status(200).json({ message: `Sale ${data.saleNumber} voided and stock returned`, data });
}
