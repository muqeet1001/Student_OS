import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../services/token.service.js';

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/** Rejects the request unless a valid access token maps to an active user. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);

  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  req.user = user;
  next();
});

/** Attaches req.user when a token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = (await User.findById(payload.sub)) || undefined;
  } catch {
    // An invalid token on an optional route is simply treated as anonymous.
  }
  return next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('This action requires elevated permissions'));
  }
  if (req.user.role === 'admin' && req.user.staffRole === 'viewer' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next(ApiError.forbidden('View-only placement staff cannot change records'));
  }
  return next();
};
