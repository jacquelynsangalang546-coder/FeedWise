import mongoose from 'mongoose';
import { EMAIL_REGEX, PH_MOBILE_REGEX } from './validators.js';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Supplier name must be at least 2 characters'],
      maxlength: [100, 'Supplier name must be at most 100 characters'],
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
      maxlength: [80, 'Contact person must be at most 80 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [PH_MOBILE_REGEX, 'Phone must be a PH mobile number like 09171234567'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      validate: {
        validator: (value) => value === '' || EMAIL_REGEX.test(value),
        message: 'Email address is not valid',
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address must be at most 200 characters'],
      default: '',
    },
    // Days between ordering and delivery - used to suggest when to reorder
    leadTimeDays: {
      type: Number,
      min: [0, 'Lead time cannot be negative'],
      max: [60, 'Lead time must be at most 60 days'],
      default: 3,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Supplier', supplierSchema);
