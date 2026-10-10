import { z } from 'zod';
import { requiredNumber } from './shared';

export const ANIMAL_TYPES = ['poultry', 'dog', 'cat', 'livestock', 'general'] as const;
export const UNITS = ['sack', 'kg', 'pack', 'bottle', 'can', 'piece', 'box'] as const;

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,20}$/, '3-20 characters: letters, numbers and dashes'),
    category: z.string().min(1, 'Choose a category'),
    supplier: z.string(),
    animalType: z.enum(ANIMAL_TYPES, { error: 'Choose an animal type' }),
    unit: z.enum(UNITS, { error: 'Choose a unit' }),
    costPrice: requiredNumber('Cost price').min(0, 'Cost price cannot be negative').max(1_000_000, 'Too large'),
    sellingPrice: requiredNumber('Selling price').min(0.01, 'Selling price must be more than 0').max(1_000_000, 'Too large'),
    stock: requiredNumber('Stock').int('Use a whole number').min(0, 'Stock cannot be negative').max(100_000, 'Too large'),
    reorderLevel: requiredNumber('Reorder level')
      .int('Use a whole number')
      .min(0, 'Cannot be negative')
      .max(10_000, 'Too large'),
    expiryDate: z.string(),
    description: z.string().trim().max(300, 'Description must be at most 300 characters'),
    isActive: z.boolean(),
  })
  // Business rule shared with the server: never sell below cost
  .refine((values) => values.sellingPrice >= values.costPrice, {
    path: ['sellingPrice'],
    message: 'Selling price cannot be lower than cost price',
  });

export type ProductFormValues = z.infer<typeof productSchema>;
