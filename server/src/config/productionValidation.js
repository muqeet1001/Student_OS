const MIN_SECRET_LENGTH = 32;

/** Fail fast on production auth material that is easy to guess or cross-use. */
export function assertProductionSecurity(config) {
  if (!config.isProduction) return;

  const secrets = {
    JWT_ACCESS_SECRET: config.jwt.accessSecret,
    JWT_REFRESH_SECRET: config.jwt.refreshSecret,
    CHECKIN_SECRET: config.checkinSecret,
  };

  const weak = Object.entries(secrets)
    .filter(([, value]) => String(value).length < MIN_SECRET_LENGTH)
    .map(([name]) => name);

  if (weak.length) {
    throw new Error(
      `${weak.join(', ')} must be at least ${MIN_SECRET_LENGTH} characters in production. ` +
        'Generate each with `openssl rand -hex 48`.',
    );
  }

  const entries = Object.entries(secrets);
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      if (entries[left][1] === entries[right][1]) {
        throw new Error(
          `${entries[left][0]} and ${entries[right][0]} must use different values in production.`,
        );
      }
    }
  }

  if (config.codeRunner?.provider !== 'judge0') {
    throw new Error('CODE_RUNNER_PROVIDER must be judge0 in production.');
  }

  if (config.codeRunner?.fallbackLocal) {
    throw new Error('CODE_RUNNER_FALLBACK_LOCAL must be false in production.');
  }
}

export const __testing = { MIN_SECRET_LENGTH };
