// Money is calculated in centavos (integers) to avoid floating-point errors
// such as 0.1 + 0.2 = 0.30000000000000004, then converted back to pesos.

export const toCents = (amount) => Math.round(Number(amount) * 100);
export const fromCents = (cents) => Math.round(cents) / 100;
export const round2 = (amount) => fromCents(toCents(amount));
