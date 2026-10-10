import ApiError from '../utils/ApiError.js';
import {
  getCategorySales,
  getDashboard,
  getInventoryReport,
  getSalesSummary,
  getTopProducts,
  parseDateRange,
} from '../services/reportService.js';

// GET /api/reports/dashboard
export async function dashboard(req, res) {
  res.status(200).json({ data: await getDashboard() });
}

// GET /api/reports/sales-summary?from=&to=
export async function salesSummary(req, res) {
  const range = parseDateRange(req.query, 30);
  res.status(200).json({ data: await getSalesSummary(range) });
}

// GET /api/reports/top-products?from=&to=&limit=10&sortBy=quantity|revenue|profit
export async function topProducts(req, res) {
  const range = parseDateRange(req.query, 30);
  const limit = Number.parseInt(req.query.limit ?? '10', 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw ApiError.badRequest('limit must be a whole number between 1 and 50');
  }
  const result = await getTopProducts(range, { limit, sortBy: req.query.sortBy ?? 'quantity' });
  res.status(200).json({ data: { range: { from: range.fromKey, to: range.toKey }, ...result } });
}

// GET /api/reports/category-sales?from=&to=
export async function categorySales(req, res) {
  const range = parseDateRange(req.query, 30);
  const result = await getCategorySales(range);
  res.status(200).json({ data: { range: { from: range.fromKey, to: range.toKey }, ...result } });
}

// GET /api/reports/inventory
export async function inventory(req, res) {
  res.status(200).json({ data: await getInventoryReport() });
}
