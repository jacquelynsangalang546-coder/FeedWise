import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product, { ANIMAL_TYPES } from '../models/Product.js';
import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Supplier from '../models/Supplier.js';
import ApiError from '../utils/ApiError.js';
import { fromCents, toCents } from '../utils/money.js';
import { assertUnique, escapeRegex, pick } from '../utils/request.js';
import {
  adjustStock,
  checkAvailability,
  findLowStockProducts,
  getExpiryStatus,
  getStockStatus,
} from '../services/inventoryService.js';

const FIELDS = [
  'name',
  'sku',
  'category',
  'supplier',
  'animalType',
  'unit',
  'costPrice',
  'sellingPrice',
  'stock',
  'reorderLevel',
  'expiryDate',
  'description',
  'isActive',
];

const SORTS = {
  name: { name: 1 },
  '-name': { name: -1 },
  price: { sellingPrice: 1 },
  '-price': { sellingPrice: -1 },
  stock: { stock: 1 },
  '-stock': { stock: -1 },
  newest: { createdAt: -1 },
};

// Make sure referenced category / supplier exist before saving a product
async function assertReferences(data) {
  if (data.category !== undefined) {
    if (!mongoose.isValidObjectId(data.category)) {
      throw ApiError.badRequest('Validation failed', { errors: { category: 'Select a valid category' } });
    }
    if (!(await Category.exists({ _id: data.category }))) {
      throw ApiError.badRequest('Validation failed', { errors: { category: 'Category does not exist' } });
    }
  }
  if (data.supplier === '') data.supplier = null;
  if (data.supplier) {
    if (!mongoose.isValidObjectId(data.supplier)) {
      throw ApiError.badRequest('Validation failed', { errors: { supplier: 'Select a valid supplier' } });
    }
    if (!(await Supplier.exists({ _id: data.supplier }))) {
      throw ApiError.badRequest('Validation failed', { errors: { supplier: 'Supplier does not exist' } });
    }
  }
  if (data.expiryDate === '') data.expiryDate = null;
}

function withComputed(product) {
  const plain = product.toObject();
  return { ...plain, expiryStatus: getExpiryStatus(product) };
}

/**
 * GET /api/products
 * Multi-criteria search: ?search=&category=&supplier=&animalType=&stockStatus=ok|low|out&status=active|archived|all&sort=
 */
export async function listProducts(req, res) {
  const { search, category, supplier, animalType, stockStatus, status = 'active', sort = 'name' } = req.query;
  const filter = {};

  if (status === 'active') filter.isActive = true;
  else if (status === 'archived') filter.isActive = false;
  else if (status !== 'all') throw ApiError.badRequest('status must be active, archived or all');

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { sku: pattern }];
  }
  if (category) {
    if (!mongoose.isValidObjectId(category)) throw ApiError.badRequest('Invalid category ID');
    filter.category = category;
  }
  if (supplier) {
    if (!mongoose.isValidObjectId(supplier)) throw ApiError.badRequest('Invalid supplier ID');
    filter.supplier = supplier;
  }
  if (animalType) {
    if (!ANIMAL_TYPES.includes(animalType)) {
      throw ApiError.badRequest(`animalType must be one of: ${ANIMAL_TYPES.join(', ')}`);
    }
    filter.animalType = animalType;
  }
  if (stockStatus && !['ok', 'low', 'out'].includes(stockStatus)) {
    throw ApiError.badRequest('stockStatus must be ok, low or out');
  }
  if (!SORTS[sort]) throw ApiError.badRequest(`sort must be one of: ${Object.keys(SORTS).join(', ')}`);

  const products = await Product.find(filter)
    .populate('category', 'name color')
    .populate('supplier', 'name')
    .sort(SORTS[sort]);

  // stockStatus compares two fields (stock vs reorderLevel), so it is applied after the query
  const data = products
    .filter((product) => !stockStatus || getStockStatus(product) === stockStatus)
    .map(withComputed);

  res.status(200).json({ data, meta: { count: data.length } });
}

// GET /api/products/low-stock
export async function listLowStock(req, res) {
  const data = await findLowStockProducts();
  res.status(200).json({ data, meta: { count: data.length } });
}

// POST /api/products/check-availability   body: { items: [{ productId, quantity }] }
export async function checkProductAvailability(req, res) {
  const { items } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('items must be a non-empty array of { productId, quantity }');
  }
  const errors = {};
  items.forEach((item, index) => {
    if (!mongoose.isValidObjectId(item?.productId)) errors[`items.${index}.productId`] = 'Invalid product ID';
    if (!Number.isInteger(item?.quantity) || item.quantity < 1) {
      errors[`items.${index}.quantity`] = 'Quantity must be a whole number of at least 1';
    }
  });
  if (Object.keys(errors).length) throw ApiError.badRequest('Invalid availability request', { errors });

  const { products: _unused, ...result } = await checkAvailability(items);
  res.status(200).json({ data: result });
}

// GET /api/products/:id  (includes sales performance)
export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name color')
    .populate('supplier', 'name contactPerson phone leadTimeDays');
  if (!product) throw ApiError.notFound('Product not found');

  // Lifetime performance from line items of completed sales
  const completedIds = await Sale.find({ status: 'completed' }).distinct('_id');
  const items = await SaleItem.find({ product: product._id, sale: { $in: completedIds } }).select('quantity lineTotal');
  res.status(200).json({
    data: {
      ...withComputed(product),
      lifetimeSold: items.reduce((sum, item) => sum + item.quantity, 0),
      lifetimeRevenue: fromCents(items.reduce((sum, item) => sum + toCents(item.lineTotal), 0)),
    },
  });
}

// POST /api/products
export async function createProduct(req, res) {
  const data = pick(req.body, FIELDS);
  await assertUnique(Product, 'sku', data.sku && String(data.sku).toUpperCase(), { label: 'SKU' });
  await assertReferences(data);
  const product = await Product.create(data);
  await product.populate([
    { path: 'category', select: 'name color' },
    { path: 'supplier', select: 'name' },
  ]);
  res.status(201).json({ message: 'Product created', data: withComputed(product) });
}

// PUT /api/products/:id
export async function updateProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const data = pick(req.body, FIELDS);
  await assertUnique(Product, 'sku', data.sku && String(data.sku).toUpperCase(), { excludeId: req.params.id, label: 'SKU' });
  await assertReferences(data);
  product.set(data);
  await product.save(); // runs every schema validator, incl. "selling price >= cost price"
  await product.populate([
    { path: 'category', select: 'name color' },
    { path: 'supplier', select: 'name' },
  ]);
  res.status(200).json({ message: 'Product updated', data: withComputed(product) });
}

// PATCH /api/products/:id/stock   body: { adjustment: 20, reason: "Delivery from supplier" }
export async function adjustProductStock(req, res) {
  const result = await adjustStock(req.params.id, req.body?.adjustment, req.body?.reason);
  res.status(200).json({
    message: `Stock ${result.adjustment > 0 ? 'added' : 'removed'}: ${Math.abs(result.adjustment)} unit(s)`,
    data: { ...withComputed(result.product), previousStock: result.previousStock },
  });
}

// DELETE /api/products/:id  (products with sales history must be archived instead)
export async function deleteProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const timesSold = await SaleItem.countDocuments({ product: product._id });
  if (timesSold > 0) {
    throw ApiError.badRequest(
      `Cannot delete "${product.name}" - it appears in ${timesSold} sale(s). Archive it instead (set it to inactive).`
    );
  }
  await product.deleteOne();
  res.status(200).json({ message: 'Product deleted', data: { _id: product._id } });
}
