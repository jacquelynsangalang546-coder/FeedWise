import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import ApiError from '../utils/ApiError.js';
import { assertUnique, escapeRegex, pick } from '../utils/request.js';

const FIELDS = ['name', 'contactPerson', 'phone', 'email', 'address', 'leadTimeDays'];

// GET /api/suppliers?search=
export async function listSuppliers(req, res) {
  const filter = {};
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: pattern }, { contactPerson: pattern }];
  }
  const [suppliers, products] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }),
    Product.find({ isActive: true, supplier: { $ne: null } }).select('supplier stock reorderLevel'),
  ]);

  const data = suppliers.map((supplier) => {
    const supplied = products.filter((product) => String(product.supplier) === String(supplier._id));
    return {
      ...supplier.toObject(),
      productCount: supplied.length,
      // Products from this supplier that need reordering
      reorderNeeded: supplied.filter((product) => product.stock <= product.reorderLevel).length,
    };
  });
  res.status(200).json({ data });
}

// GET /api/suppliers/:id
export async function getSupplier(req, res) {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  const products = await Product.find({ supplier: supplier._id }).select('name sku stock reorderLevel costPrice');
  res.status(200).json({ data: { ...supplier.toObject(), products } });
}

// POST /api/suppliers
export async function createSupplier(req, res) {
  const data = pick(req.body, FIELDS);
  await assertUnique(Supplier, 'name', data.name, { label: 'name', caseInsensitive: true });
  const supplier = await Supplier.create(data);
  res.status(201).json({ message: 'Supplier created', data: supplier });
}

// PUT /api/suppliers/:id
export async function updateSupplier(req, res) {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  const data = pick(req.body, FIELDS);
  await assertUnique(Supplier, 'name', data.name, { excludeId: req.params.id, label: 'name', caseInsensitive: true });
  supplier.set(data);
  await supplier.save();
  res.status(200).json({ message: 'Supplier updated', data: supplier });
}

// DELETE /api/suppliers/:id  (blocked while products reference it)
export async function deleteSupplier(req, res) {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  const inUse = await Product.countDocuments({ supplier: supplier._id });
  if (inUse > 0) {
    throw ApiError.badRequest(
      `Cannot delete "${supplier.name}" - ${inUse} product(s) are supplied by them. Reassign those products first.`
    );
  }
  await supplier.deleteOne();
  res.status(200).json({ message: 'Supplier deleted', data: { _id: supplier._id } });
}
