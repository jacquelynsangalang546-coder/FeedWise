import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name must be at most 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description must be at most 200 characters'],
      default: '',
    },
    // Accent color used for badges in the UI
    color: {
      type: String,
      enum: {
        values: ['green', 'amber', 'blue', 'rose', 'violet', 'teal', 'slate'],
        message: '{VALUE} is not a supported color',
      },
      default: 'green',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
