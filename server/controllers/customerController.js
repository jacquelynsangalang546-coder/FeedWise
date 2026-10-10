import Customer, { CUSTOMER_TYPES } from '../models/Customer.js';
import Sale from '../models/Sale.js';
import ApiError from '../utils/ApiError.js';
import { fromCents, toCents } from '../utils/money.js';
import { assertUnique, escapeRegex, pick } from '../utils/request.js';

const FIELDS = ['name', 'phone', 'email', 'address', 'customerType'];

// Purchase statistics per customer from completed sales
function buildStats(sales) {
  const stats = new Map();
  for (const sale of sales) {
    const key = String(sale.customer);
    const entry = stats.get(key) ?? { purchaseCount: 0, totalSpentCents: 0, lastPurchaseAt: null };
    entry.purchaseCount += 1;
    entry.totalSpentCents += toCents(sale.total);
    if (!entry.lastPurchaseAt || sale.createdAt > entry.lastPurchaseAt) entry.lastPurchaseAt = sale.createdAt;
    stats.set(key, entry);
  }
  return stats;
}

function formatStats(entry) {
  if (!entry) return { purchaseCount: 0, totalSpent: 0, averageSpent: 0, lastPurchaseAt: null };
  return {
    purchaseCount: entry.purchaseCount,
    totalSpent: fromCents(entry.totalSpentCents),
    averageSpent: fromCents(entry.totalSpentCents / entry.purchaseCount),
    lastPurchaseAt: entry.lastPurchaseAt,
  };
}

// GET /api/customers?search=&type=
export async function listCustomers(req, res) {
  const filter = {};
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }
  if (req.query.type) {
    if (!CUSTOMER_TYPES.includes(req.query.type)) {
      throw ApiError.badRequest(`type must be one of: ${CUSTOMER_TYPES.join(', ')}`);
    }
    filter.customerType = req.query.type;
  }

  const customers = await Customer.find(filter).sort({ name: 1 });
  const sales = await Sale.find({ status: 'completed', customer: { $in: customers.map((c) => c._id) } }).select(
    'customer total createdAt'
  );
  const stats = buildStats(sales);
  const data = customers.map((customer) => ({
    ...customer.toObject(),
    ...formatStats(stats.get(String(customer._id))),
  }));
  res.status(200).json({ data });
}

// GET /api/customers/:id  (includes purchase statistics and recent sales)
export async function getCustomer(req, res) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  const sales = await Sale.find({ customer: customer._id }).sort({ createdAt: -1 });
  const completed = sales.filter((sale) => sale.status === 'completed');
  res.status(200).json({
    data: {
      ...customer.toObject(),
      ...formatStats(buildStats(completed).get(String(customer._id))),
      recentSales: sales.slice(0, 10).map((sale) => ({
        _id: sale._id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        status: sale.status,
        createdAt: sale.createdAt,
      })),
    },
  });
}

// POST /api/customers
export async function createCustomer(req, res) {
  const data = pick(req.body, FIELDS);
  await assertUnique(Customer, 'phone', data.phone, { label: 'phone number' });
  const customer = await Customer.create(data);
  res.status(201).json({ message: 'Customer created', data: customer });
}

// PUT /api/customers/:id
export async function updateCustomer(req, res) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  const data = pick(req.body, FIELDS);
  await assertUnique(Customer, 'phone', data.phone, { excludeId: req.params.id, label: 'phone number' });
  customer.set(data);
  await customer.save();
  res.status(200).json({ message: 'Customer updated', data: customer });
}

// DELETE /api/customers/:id  (blocked if they have sales history)
export async function deleteCustomer(req, res) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  const saleCount = await Sale.countDocuments({ customer: customer._id });
  if (saleCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete "${customer.name}" - they have ${saleCount} sale(s) on record. Sales history must be kept.`
    );
  }
  await customer.deleteOne();
  res.status(200).json({ message: 'Customer deleted', data: { _id: customer._id } });
}
