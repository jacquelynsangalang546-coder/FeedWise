import { z } from 'zod';

export const MAX_PERCENT_DISCOUNT = 50;

export const saleSchema = z
  .object({
    customer: z.string(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z
            .number({ error: 'Enter a quantity' })
            .int('Whole numbers only')
            .min(1, 'At least 1')
            .max(1000, 'Max 1000'),
        })
      )
      .min(1, 'Add at least one product to the sale'),
    discountType: z.enum(['none', 'percent', 'fixed']),
    discountValue: z.number({ error: 'Enter a discount (0 for none)' }).min(0, 'Discount cannot be negative'),
    paymentMethod: z.enum(['cash', 'gcash', 'card'], { error: 'Choose a payment method' }),
    amountTendered: z.number().min(0, 'Cannot be negative').optional(),
    notes: z.string().trim().max(200, 'Notes must be at most 200 characters'),
  })
  .refine((values) => values.discountType !== 'percent' || values.discountValue <= MAX_PERCENT_DISCOUNT, {
    path: ['discountValue'],
    message: `Percent discount cannot exceed ${MAX_PERCENT_DISCOUNT}%`,
  });

export type SaleFormValues = z.infer<typeof saleSchema>;
