import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const REFRESH_COOKIE = 'sos_refresh';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), jti: crypto.randomUUID() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/** Refresh tokens and one-time verification/reset tokens are persisted as SHA-256 hashes, never in plaintext. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** Generates a cryptographically secure random hex token for one-time verification or password reset links. */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    // Client and API share an origin in production. Lax blocks cross-site
    // form/fetch requests from carrying this credential.
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export { REFRESH_COOKIE };
