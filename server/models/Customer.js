import mongoose from 'mongoose';
import { EMAIL_REGEX, PH_MOBILE_REGEX } from './validators.js';

export const CUSTOMER_TYPES = ['retail', 'wholesale', 'farm'];

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [80, 'Customer name must be at most 80 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true,
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
    customerType: {
      type: String,
      enum: { values: CUSTOMER_TYPES, message: '{VALUE} is not a valid customer type' },
      default: 'retail',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Customer', customerSchema);
