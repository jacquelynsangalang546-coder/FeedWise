import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

// Central error handler. Express recognizes it as an error handler because it
// has FOUR parameters. It must be registered LAST, after routes and the 404 catch-all.
// Every error response uses the same JSON shape: { message, errors?, details? }
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // Our own errors (thrown with an explicit status code)
  if (err instanceof ApiError) {
    const body = { message: err.message };
    if (err.errors) body.errors = err.errors;
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // Mongoose schema validation failed -> 400 with a per-field error map
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = {};
    for (const [field, fieldError] of Object.entries(err.errors)) {
      errors[field] = fieldError.message;
    }
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  // Invalid ObjectId or wrong type in a query -> 400
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid value for "${err.path}": ${JSON.stringify(err.value)}` });
  }

  // Unique index violation (e.g. duplicate SKU) -> 400
  if (err?.code === 11000) {
    // MongoDB reports the field in keyValue/keyPattern; fall back to the index name in the message
    const field =
      Object.keys(err.keyValue ?? err.keyPattern ?? {})[0] ?? /index: (\w+?)_-?1/.exec(err.message ?? '')?.[1] ?? 'field';
    const value = err.keyValue?.[field];
    return res.status(400).json({
      message: `A record with this ${field}${value !== undefined ? ` "${value}"` : ''} already exists`,
      errors: { [field]: 'Must be unique' },
    });
  }

  // Malformed JSON body sent by the client -> 400
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  // Anything else is unexpected -> 500 (details logged on the server only)
  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Internal server error' });
}
