import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Translates known error shapes into a consistent JSON envelope:
 *   { success: false, message, details? }
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (error instanceof ZodError) {
    error = ApiError.badRequest('Validation failed', {
      fields: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  } else if (error instanceof mongoose.Error.ValidationError) {
    error = ApiError.badRequest('Validation failed', {
      fields: Object.values(error.errors).map((e) => ({
        path: e.path,
        message: e.message,
      })),
    });
  } else if (error instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for "${error.path}"`);
  } else if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || { field: 1 })[0];
    error = ApiError.conflict(`An account with that ${field} already exists`);
  } else if (error?.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  } else if (error?.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  if (!(error instanceof ApiError)) {
    logger.error('Unhandled error:', err?.stack || err);
    error = ApiError.internal(
      config.isProduction ? 'Something went wrong' : err?.message || 'Something went wrong',
    );
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(config.isProduction ? {} : { stack: err?.stack }),
  });
}
