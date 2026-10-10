import { z } from 'zod';

export const PH_MOBILE_REGEX = /^(09|\+639)\d{9}$/;

export const phoneField = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(PH_MOBILE_REGEX, 'Use a PH mobile number like 09171234567');

// Optional email: empty string is allowed, otherwise must be a valid address
export const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Enter a valid email address');

// Number inputs registered with { valueAsNumber: true } give NaN when empty
export const requiredNumber = (label: string) => z.number({ error: `${label} is required` });
