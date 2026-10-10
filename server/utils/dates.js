// The store operates in the Philippines (UTC+08:00, no daylight saving time).
// All "day" boundaries for reports are computed in store time, not server time.
export const STORE_UTC_OFFSET = '+08:00';
const OFFSET_MS = 8 * 60 * 60 * 1000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00${STORE_UTC_OFFSET}`);
  return !Number.isNaN(date.getTime());
}

// "2026-10-01" -> Date for 2026-10-01 00:00 in store time
export function startOfStoreDay(dateString) {
  return new Date(`${dateString}T00:00:00.000${STORE_UTC_OFFSET}`);
}

// "2026-10-01" -> Date for 2026-10-01 23:59:59.999 in store time
export function endOfStoreDay(dateString) {
  return new Date(`${dateString}T23:59:59.999${STORE_UTC_OFFSET}`);
}

// Date -> "YYYY-MM-DD" in store time
export function toStoreDateKey(date) {
  return new Date(new Date(date).getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

// Today's date key in store time, optionally shifted by a number of days
export function storeDateKeyFromToday(daysOffset = 0) {
  return toStoreDateKey(new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000));
}

// List of consecutive "YYYY-MM-DD" keys from start to end (inclusive)
export function dateKeysBetween(startKey, endKey) {
  const keys = [];
  let cursor = startOfStoreDay(startKey).getTime();
  const end = startOfStoreDay(endKey).getTime();
  while (cursor <= end) {
    keys.push(toStoreDateKey(cursor));
    cursor += 24 * 60 * 60 * 1000;
  }
  return keys;
}

export function daysBetween(from, to) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));
}
