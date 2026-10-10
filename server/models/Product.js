import mongoose from 'mongoose';

export const ANIMAL_TYPES = ['poultry', 'dog', 'cat', 'livestock', 'general'];
export const UNITS = ['sack', 'kg', 'pack', 'bottle', 'can', 'piece', 'box'];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name must be at most 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      unique: true,
      match: [/^[A-Z0-9-]{3,20}$/, 'SKU must be 3-20 characters: letters, numbers and dashes only'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    animalType: {
      type: String,
      enum: { values: ANIMAL_TYPES, message: '{VALUE} is not a valid animal type' },
      default: 'general',
    },
    unit: {
      type: String,
      enum: { values: UNITS, message: '{VALUE} is not a valid unit' },
      default: 'piece',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
      max: [1_000_000, 'Cost price is too large'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0.01, 'Selling price must be greater than 0'],
      max: [1_000_000, 'Selling price is too large'],
      validate: {
        // Business rule: never sell below cost. "this" is the document because
        // updates are done with doc.save() (not findByIdAndUpdate).
        validator(value) {
          return this.costPrice === undefined || value >= this.costPrice;
        },
        message: 'Selling price cannot be lower than cost price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
      default: 0,
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      min: [0, 'Reorder level cannot be negative'],
      max: [10_000, 'Reorder level is too large'],
      validate: { validator: Number.isInteger, message: 'Reorder level must be a whole number' },
      default: 5,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description must be at most 300 characters'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---- Derived values (computed, never stored) ----

// "out" when nothing left, "low" when at or below reorder level, otherwise "ok"
productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.stock <= 0) return 'out';
  if (this.stock <= this.reorderLevel) return 'low';
  return 'ok';
});

// Profit margin as a percentage of the selling price
productSchema.virtual('marginPercent').get(function marginPercent() {
  if (!this.sellingPrice) return 0;
  return Math.round(((this.sellingPrice - this.costPrice) / this.sellingPrice) * 1000) / 10;
});

export default mongoose.model('Product', productSchema);
