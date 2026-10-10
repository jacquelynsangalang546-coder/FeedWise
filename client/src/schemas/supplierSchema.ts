import { z } from 'zod';
import { optionalEmail, phoneField, requiredNumber } from './shared';

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  contactPerson: z.string().trim().min(2, 'Contact person is required').max(80, 'Must be at most 80 characters'),
  phone: phoneField,
  email: optionalEmail,
  address: z.string().trim().max(200, 'Address must be at most 200 characters'),
  leadTimeDays: requiredNumber('Lead time')
    .int('Use whole days')
    .min(0, 'Lead time cannot be negative')
    .max(60, 'Lead time must be at most 60 days'),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
