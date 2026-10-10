import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  direction: z.enum(['add', 'remove']),
  quantity: z
    .number({ error: 'Enter a quantity' })
    .int('Use a whole number')
    .min(1, 'At least 1 unit')
    .max(100_000, 'Too large'),
  reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(120, 'Keep it under 120 characters'),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(120, 'Keep it under 120 characters'),
});

export type VoidSaleValues = z.infer<typeof voidSaleSchema>;
