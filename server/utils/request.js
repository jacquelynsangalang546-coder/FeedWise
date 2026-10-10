import ApiError from './ApiError.js';

// Copies only the allowed fields from the request body, so clients cannot set
// protected fields such as _id, createdAt or computed totals.
export function pick(source = {}, fields) {
  const result = {};
  for (const field of fields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
}

// Escapes user text before using it inside a RegExp (search boxes).
export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Friendly uniqueness check before saving (the unique index is still the final guard).
 * Throws 400 with a per-field error if another record already uses the value.
 */
export async function assertUnique(Model, field, value, { excludeId, label = field, caseInsensitive = false } = {}) {
  if (value === undefined || value === null || value === '') return;
  const text = String(value).trim();
  const match = caseInsensitive ? new RegExp(`^${escapeRegex(text)}$`, 'i') : text;
  const filter = { [field]: match };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Model.exists(filter)) {
    throw ApiError.badRequest(`A record with this ${label} "${text}" already exists`, {
      errors: { [field]: `This ${label} is already used` },
    });
  }
}
