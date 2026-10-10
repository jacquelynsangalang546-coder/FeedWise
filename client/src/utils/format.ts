const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });
const pesoShort = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat('en-PH');

export const formatPeso = (value: number) => peso.format(value);
export const formatPesoShort = (value: number) => (Math.abs(value) >= 10_000 ? pesoShort.format(value) : peso.format(value));
export const formatNumber = (value: number) => number.format(value);

export const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

export const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });

// "2026-10-05" -> "Oct 5"
export const formatDayKey = (key: string) =>
  new Date(`${key}T00:00:00+08:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });

// Today's date in store time as YYYY-MM-DD, optionally shifted by N days
export function storeDateKey(daysOffset = 0) {
  const shifted = new Date(Date.now() + daysOffset * 86_400_000 + 8 * 3_600_000);
  return shifted.toISOString().slice(0, 10);
}

export const unitLabel = (unit: string, quantity = 2) => {
  if (quantity === 1 || unit === 'kg') return unit;
  return unit === 'box' ? 'boxes' : `${unit}s`;
};

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const paymentLabel: Record<string, string> = { cash: 'Cash', gcash: 'GCash', card: 'Card' };
