import assert from 'node:assert/strict';
import test from 'node:test';

import { assertProductionSecurity } from '../src/config/productionValidation.js';

function candidate(overrides = {}) {
  return {
    isProduction: true,
    jwt: {
      accessSecret: 'a'.repeat(48),
      refreshSecret: 'b'.repeat(48),
    },
    checkinSecret: 'c'.repeat(48),
    codeRunner: { provider: 'judge0', fallbackLocal: false },
    ...overrides,
  };
}

test('strong independent production secrets pass', () => {
  assert.doesNotThrow(() => assertProductionSecurity(candidate()));
});

test('short production secrets fail fast', () => {
  assert.throws(
    () => assertProductionSecurity(candidate({ checkinSecret: 'short' })),
    /CHECKIN_SECRET must be at least 32 characters/,
  );
});

test('secrets cannot be reused across purposes', () => {
  const shared = 's'.repeat(48);
  assert.throws(
    () => assertProductionSecurity(candidate({
      jwt: { accessSecret: shared, refreshSecret: shared },
    })),
    /JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must use different values/,
  );
});

test('development remains convenient', () => {
  assert.doesNotThrow(() => assertProductionSecurity({
    isProduction: false,
    jwt: { accessSecret: 'dev', refreshSecret: 'dev' },
    checkinSecret: 'dev',
  }));
});

test('production cannot execute submissions inside the web container', () => {
  assert.throws(
    () => assertProductionSecurity(candidate({
      codeRunner: { provider: 'judge0', fallbackLocal: true },
    })),
    /CODE_RUNNER_FALLBACK_LOCAL must be false/,
  );

  assert.throws(
    () => assertProductionSecurity(candidate({
      codeRunner: { provider: 'local', fallbackLocal: false },
    })),
    /CODE_RUNNER_PROVIDER must be judge0/,
  );
});
