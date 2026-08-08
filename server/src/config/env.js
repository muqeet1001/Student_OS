import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
