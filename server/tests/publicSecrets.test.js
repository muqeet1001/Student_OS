import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { assertSecretsAreNotPublic, findPublishedSecrets } from '../src/config/publicSecrets.js';

/**
 * `server/.env` is committed on purpose so a clone runs without setup. The
 * risk that creates is not the decision — it is forgetting it, deploying, and
 * running a real cohort's placement records behind a JWT secret that is
 * readable on GitHub. These tests cover the guard that makes that impossible.
 */

/** Reads the committed .env, which is the thing the guard has to recognise. */
function committed(name) {
  const envPath = path.resolve(import.meta.dirname, '../.env');
  const contents = readFileSync(envPath, 'utf8');
  return contents.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim();
}

test('the fingerprints still match what is committed', () => {
  /*
   * The guard stores hashes, so it silently stops protecting anything if the
   * committed values are ever rotated without updating them. This test is
   * what turns that silent drift into a failure — and if it fails after a
   * deliberate rotation, the fix is to refresh the hashes in
   * publicSecrets.js, not to delete this test.
   */
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CHECKIN_SECRET', 'MONGO_URI']) {
    const value = committed(name);
    assert.ok(value, `${name} is not in server/.env`);

    assert.deepEqual(
      findPublishedSecrets({ [name]: value }),
      [name],
      `${name} in server/.env is no longer recognised as published — refresh its hash`,
    );
  }
});

test('production refuses to start on a committed secret', () => {
  assert.throws(
    () => assertSecretsAreNotPublic({ JWT_ACCESS_SECRET: committed('JWT_ACCESS_SECRET') }, { isProduction: true }),
    /Refusing to start.*JWT_ACCESS_SECRET/s,
  );
});

test('every exposed variable is named, not just the first', () => {
  // A message naming one of four means three more rotations get missed.
  assert.throws(
    () =>
      assertSecretsAreNotPublic(
        {
          JWT_ACCESS_SECRET: committed('JWT_ACCESS_SECRET'),
          JWT_REFRESH_SECRET: committed('JWT_REFRESH_SECRET'),
          CHECKIN_SECRET: committed('CHECKIN_SECRET'),
        },
        { isProduction: true },
      ),
    (error) =>
      /JWT_ACCESS_SECRET/.test(error.message) &&
      /JWT_REFRESH_SECRET/.test(error.message) &&
      /CHECKIN_SECRET/.test(error.message),
  );
});

test('development is untouched — that is what the committed file is for', () => {
  assert.doesNotThrow(() =>
    assertSecretsAreNotPublic(
      { JWT_ACCESS_SECRET: committed('JWT_ACCESS_SECRET') },
      { isProduction: false },
    ),
  );
});

test('freshly generated secrets pass in production', () => {
  const fresh = createHash('sha512').update(`${Date.now()}-not-committed`).digest('hex');

  assert.doesNotThrow(() =>
    assertSecretsAreNotPublic(
      { JWT_ACCESS_SECRET: fresh, JWT_REFRESH_SECRET: `${fresh}x`, CHECKIN_SECRET: `${fresh}y` },
      { isProduction: true },
    ),
  );
});

test('an unset variable is not reported as exposed', () => {
  // Empty is a configuration problem for `required()` to complain about, not
  // a leaked credential. Reporting it here would bury the real ones.
  assert.deepEqual(findPublishedSecrets({ AI_API_KEY: '', MONGO_URI: undefined }), []);
});

test('the guard matches a value only against the variable it belongs to', () => {
  // The same string in a different variable is not the published secret for
  // that variable, and saying so would be noise.
  assert.deepEqual(findPublishedSecrets({ JWT_REFRESH_SECRET: committed('JWT_ACCESS_SECRET') }), []);
});
