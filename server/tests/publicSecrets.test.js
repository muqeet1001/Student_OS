import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test, { after, before } from 'node:test';

import {
  __testing,
  assertSecretsAreNotPublic,
  findPublishedSecrets,
} from '../src/config/publicSecrets.js';

const EXPOSED_FIXTURE = 'fixture-secret-known-to-have-been-exposed';
const EXPOSED_NAME = 'JWT_ACCESS_SECRET';
let fixtureFingerprint;
let previous;

before(() => {
  fixtureFingerprint = __testing.fingerprint(EXPOSED_FIXTURE);
  previous = __testing.PUBLISHED.get(fixtureFingerprint);
  __testing.PUBLISHED.set(fixtureFingerprint, EXPOSED_NAME);
});

after(() => {
  if (previous) __testing.PUBLISHED.set(fixtureFingerprint, previous);
  else __testing.PUBLISHED.delete(fixtureFingerprint);
});

test('production refuses to start on a known exposed secret', () => {
  assert.throws(
    () => assertSecretsAreNotPublic({ [EXPOSED_NAME]: EXPOSED_FIXTURE }, { isProduction: true }),
    /Refusing to start.*JWT_ACCESS_SECRET/s,
  );
});

test('every exposed variable is named, not just the first', () => {
  const refreshFixture = `${EXPOSED_FIXTURE}-refresh`;
  const refreshFingerprint = __testing.fingerprint(refreshFixture);
  __testing.PUBLISHED.set(refreshFingerprint, 'JWT_REFRESH_SECRET');

  try {
    assert.throws(
      () => assertSecretsAreNotPublic(
        { JWT_ACCESS_SECRET: EXPOSED_FIXTURE, JWT_REFRESH_SECRET: refreshFixture },
        { isProduction: true },
      ),
      (error) => /JWT_ACCESS_SECRET/.test(error.message) && /JWT_REFRESH_SECRET/.test(error.message),
    );
  } finally {
    __testing.PUBLISHED.delete(refreshFingerprint);
  }
});

test('development permits a known exposed value for local compatibility', () => {
  assert.doesNotThrow(() =>
    assertSecretsAreNotPublic({ [EXPOSED_NAME]: EXPOSED_FIXTURE }, { isProduction: false }),
  );
});

test('freshly generated secrets pass in production', () => {
  const fresh = createHash('sha512').update(`${Date.now()}-not-exposed`).digest('hex');
  assert.doesNotThrow(() =>
    assertSecretsAreNotPublic(
      { JWT_ACCESS_SECRET: fresh, JWT_REFRESH_SECRET: `${fresh}x`, CHECKIN_SECRET: `${fresh}y` },
      { isProduction: true },
    ),
  );
});

test('an unset variable is not reported as exposed', () => {
  assert.deepEqual(findPublishedSecrets({ AI_API_KEY: '', MONGO_URI: undefined }), []);
});

test('a fingerprint matches only the variable it belongs to', () => {
  assert.deepEqual(findPublishedSecrets({ JWT_REFRESH_SECRET: EXPOSED_FIXTURE }), []);
});
