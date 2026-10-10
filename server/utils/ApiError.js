// An error that carries an HTTP status code so the error handler can respond correctly.
// extra.errors  -> per-field messages, e.g. { discountValue: 'Too high' }
// extra.details -> any other useful data, e.g. a list of stock shortages
export default class ApiError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = extra.errors;
    this.details = extra.details;
  }

  static badRequest(message, extra) {
    return new ApiError(400, message, extra);
  }

  static notFound(message = 'Record not found') {
    return new ApiError(404, message);
  }

  static conflict(message, extra) {
    return new ApiError(409, message, extra);
  }
}
