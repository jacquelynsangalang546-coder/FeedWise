import { z } from 'zod';
import { optionalEmail, phoneField } from './shared';

export const CUSTOMER_TYPES = ['retail', 'wholesale', 'farm'] as const;

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters'),
  phone: phoneField,
  email: optionalEmail,
  address: z.string().trim().max(200, 'Address must be at most 200 characters'),
  customerType: z.enum(CUSTOMER_TYPES, { error: 'Choose a customer type' }),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
