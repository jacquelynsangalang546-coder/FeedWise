import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import { assertUnique, pick } from '../utils/request.js';

const FIELDS = ['name', 'description', 'color'];

// Counts active products per category: { categoryId: count }
async function productCountsByCategory() {
  const products = await Product.find({ isActive: true }).select('category stock reorderLevel');
  const counts = new Map();
  for (const product of products) {
    const key = String(product.category);
    const entry = counts.get(key) ?? { productCount: 0, lowStockCount: 0 };
    entry.productCount += 1;
    if (product.stock <= product.reorderLevel) entry.lowStockCount += 1;
    counts.set(key, entry);
  }
  return counts;
}

// GET /api/categories
export async function listCategories(req, res) {
  const [categories, counts] = await Promise.all([Category.find().sort({ name: 1 }), productCountsByCategory()]);
  const data = categories.map((category) => ({
    ...category.toObject(),
    ...(counts.get(String(category._id)) ?? { productCount: 0, lowStockCount: 0 }),
  }));
  res.status(200).json({ data });
}

// GET /api/categories/:id
export async function getCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const products = await Product.find({ category: category._id }).select('name sku stock reorderLevel sellingPrice');
  res.status(200).json({ data: { ...category.toObject(), products } });
}

// POST /api/categories
export async function createCategory(req, res) {
  const data = pick(req.body, FIELDS);
  await assertUnique(Category, 'name', data.name, { label: 'name', caseInsensitive: true });
  const category = await Category.create(data);
  res.status(201).json({ message: 'Category created', data: category });
}

// PUT /api/categories/:id
export async function updateCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const data = pick(req.body, FIELDS);
  await assertUnique(Category, 'name', data.name, { excludeId: req.params.id, label: 'name', caseInsensitive: true });
  category.set(data);
  await category.save();
  res.status(200).json({ message: 'Category updated', data: category });
}

// DELETE /api/categories/:id  (blocked while products still use it)
export async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw ApiError.badRequest(
      `Cannot delete "${category.name}" - ${inUse} product(s) still belong to it. Move or delete them first.`
    );
  }
  await category.deleteOne();
  res.status(200).json({ message: 'Category deleted', data: { _id: category._id } });
}
