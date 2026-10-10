import { z } from 'zod';

export const CATEGORY_COLORS = ['green', 'amber', 'blue', 'rose', 'violet', 'teal', 'slate'] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  description: z.string().trim().max(200, 'Description must be at most 200 characters'),
  color: z.enum(CATEGORY_COLORS, { error: 'Choose a color' }),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
