import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertSecretsAreNotPublic } from './publicSecrets.js';
import { assertProductionSecurity } from './productionValidation.js';

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

  whatsapp: {
    webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
    token: process.env.WHATSAPP_WEBHOOK_TOKEN || '',
  },

  /*
   * The client in `services/aiClient.js` speaks the Anthropic Messages API:
   * `POST {baseUrl}/messages`, an `anthropic-version` header, and a response
   * whose text lives in `content[].text`.
   *
   * The defaults here previously pointed at `api.openai.com/v1` with
   * `gpt-4o-mini`, so the shipped configuration sent an Anthropic-shaped body
   * to an OpenAI endpoint, took a 404, and reported the narrative as merely
   * "unavailable" — with nothing in the logs saying the two halves disagreed.
   *
   * No model name is defaulted, deliberately: a model identifier is a fact
   * about the account, and a wrong one fails the same way the 404 did. When
   * either half is missing the feature reports itself unavailable instead.
   */
  ai: {
    baseUrl: (process.env.AI_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/$/, ''),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    get enabled() {
      return Boolean(process.env.AI_API_KEY && process.env.AI_MODEL);
    },
  },

  /*
   * How long a password reset link stays usable. Deliberately short rather than
   * generous: the link is a way into an account and it travels through email,
   * where it can sit in an inbox long after the student has moved on.
   */
  passwordReset: {
    ttlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 30,
  },

  /*
   * How long an email-verification link stays usable. Deliberately much longer
   * than a password reset: that link is a way into an account, while this one
   * only asserts an address is reachable, so it can afford to survive a weekend
   * away from a laptop. Defaults to a week.
   */
  emailVerification: {
    ttlMinutes: Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES) || 10080,
  },

  codeRunner: {
    timeoutMs: Number(process.env.CODE_RUNNER_TIMEOUT_MS) || 4000,
    maxOutput: Number(process.env.CODE_RUNNER_MAX_OUTPUT) || 10_000,
    provider: process.env.CODE_RUNNER_PROVIDER || 'judge0',
    apiUrl: (process.env.CODE_RUNNER_API_URL || 'https://ce.judge0.com').replace(/\/$/, ''),
    apiKey: process.env.CODE_RUNNER_API_KEY || '',
    apiKeyHeader: process.env.CODE_RUNNER_API_KEY_HEADER || 'X-RapidAPI-Key',
    languageId: Number(process.env.CODE_RUNNER_LANGUAGE_ID) || 0,
    remoteTimeoutMs: Number(process.env.CODE_RUNNER_REMOTE_TIMEOUT_MS) || 15_000,
    // node:vm is useful for trusted development, but is not a security
    // boundary. Never silently move untrusted code into the web container in
    // production merely because the remote judge is unavailable.
    fallbackLocal:
      process.env.CODE_RUNNER_FALLBACK_LOCAL === 'true' ||
      (!isProduction && process.env.CODE_RUNNER_FALLBACK_LOCAL !== 'false'),
  },
};

/*
 * Checked at import, so a misconfigured production server fails on startup
 * rather than after it has begun accepting traffic. See publicSecrets.js for
 * why this exists at all.
 */
assertProductionSecurity(config);
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
