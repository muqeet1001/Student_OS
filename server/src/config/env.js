import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertSecretsAreNotPublic } from './publicSecrets.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '../..');

dotenv.config({ path: path.join(serverRoot, '.env') });

const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) {
    if (isProduction) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    // In development we fall back to a fixed dev-only value so a fresh clone
    // boots without any setup. Production always demands real secrets.
    return `dev-only-insecure-${name.toLowerCase()}`;
  }
  return value;
}

export const config = {
  isProduction,
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverRoot,
  uploadsDir: path.join(serverRoot, 'uploads'),

  mongoUri: process.env.MONGO_URI || '',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  /*
   * Its own secret rather than reusing a JWT one: check-in codes are shown
   * on a projector to a room full of people, so the material behind them
   * should never be the material behind a session token.
   */
  checkinSecret: required('CHECKIN_SECRET'),

  /*
   * Optional. Without it there is no email, and the announcements feature
   * says so rather than claiming messages were sent.
   */
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Student OS <no-reply@studentos.local>',
  },

  ai: {
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    get enabled() {
      return Boolean(process.env.AI_API_KEY);
    },
  },

  codeRunner: {
    timeoutMs: Number(process.env.CODE_RUNNER_TIMEOUT_MS) || 4000,
    maxOutput: Number(process.env.CODE_RUNNER_MAX_OUTPUT) || 10_000,
  },
};

/*
 * Checked at import, so a misconfigured production server fails on startup
 * rather than after it has begun accepting traffic. See publicSecrets.js for
 * why this exists at all.
 */
assertSecretsAreNotPublic(
  {
    JWT_ACCESS_SECRET: config.jwt.accessSecret,
    JWT_REFRESH_SECRET: config.jwt.refreshSecret,
    CHECKIN_SECRET: config.checkinSecret,
    MONGO_URI: config.mongoUri,
    AI_API_KEY: config.ai.apiKey,
  },
  { isProduction },
);
