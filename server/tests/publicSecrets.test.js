import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

import { __testing as validationTesting } from '../src/config/productionValidation.js';
import {
  __testing,
  assertSecretsAreNotPublic,
  findPlaceholderSecrets,
  findPublishedSecrets,
} from '../src/config/publicSecrets.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleEnv = readFileSync(path.join(serverRoot, '.env.example'), 'utf8');

/** The placeholder that reached production silently. See the module's comment. */
const COPY_PASTE_PLACEHOLDER = 'change-me-to-a-long-random-string';

/** Reads a variable's value out of the example file; null when it is absent. */
function envExampleValue(name) {
  const match = exampleEnv.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

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

test('the placeholder shipped in .env.example is on the guard list', () => {
  /*
   * Ties the literal used by these tests to the list inside the module, so
   * editing one without the other fails here instead of quietly leaving the
   * guard untested.
   */
  assert.ok(
    __testing.PLACEHOLDERS.includes(COPY_PASTE_PLACEHOLDER),
    'the placeholder in .env.example must be listed in PLACEHOLDERS',
  );
});

test('a secret copied out of .env.example is refused in production', () => {
  assert.throws(
    () =>
      assertSecretsAreNotPublic(
        { CHECKIN_SECRET: COPY_PASTE_PLACEHOLDER },
        { isProduction: true },
      ),
    /CHECKIN_SECRET.*placeholder from \.env\.example/s,
  );
});

test('the placeholder is refused wherever it is pasted, not only in its own variable', () => {
  // The check is about the value being published, not about which variable it
  // landed in — pasting it into a JWT secret is the same mistake.
  assert.throws(
    () =>
      assertSecretsAreNotPublic(
        { JWT_ACCESS_SECRET: COPY_PASTE_PLACEHOLDER },
        { isProduction: true },
      ),
    /JWT_ACCESS_SECRET/,
  );
});

test('development still boots on a placeholder, so a fresh clone needs no setup', () => {
  assert.doesNotThrow(() =>
    assertSecretsAreNotPublic({ CHECKIN_SECRET: COPY_PASTE_PLACEHOLDER }, { isProduction: false }),
  );
});

test('placeholders are detected across variables, and blanks are not placeholders', () => {
  assert.deepEqual(
    findPlaceholderSecrets({ CHECKIN_SECRET: '', JWT_ACCESS_SECRET: undefined, MONGO_URI: null }),
    [],
  );
  assert.deepEqual(findPlaceholderSecrets({ CHECKIN_SECRET: COPY_PASTE_PLACEHOLDER }), [
    'CHECKIN_SECRET',
  ]);
  // A real secret that merely contains a placeholder word is not one.
  assert.deepEqual(findPlaceholderSecrets({ CHECKIN_SECRET: `change-me-me-${'a'.repeat(40)}` }), []);
});

test('the placeholder cleared the length rule, which is why it needed its own check', () => {
  /*
   * Pinned because it is the whole reason this list exists. At 33 characters
   * the placeholder satisfied MIN_SECRET_LENGTH, and it was never a leaked
   * value, so neither existing check could see it.
   *
   * If a shorter placeholder is ever added this assertion is expected to move —
   * a placeholder is not dangerous because it is short, it is dangerous because
   * it is published.
   */
  assert.ok(
    COPY_PASTE_PLACEHOLDER.length >= validationTesting.MIN_SECRET_LENGTH,
    `placeholder is ${COPY_PASTE_PLACEHOLDER.length} characters, below the ${validationTesting.MIN_SECRET_LENGTH}-character rule`,
  );
});

test('.env.example ships every secret blank', () => {
  /*
   * The asymmetry this guards against: a blank value fails `required()` and
   * stops the boot, while a value that is merely *present* passes every length
   * and equality check we have. A populated example file is therefore the one
   * mistake that reaches production silently — which is exactly how
   * CHECKIN_SECRET shipped with a guessable value that signs attendance codes.
   */
  const secrets = [
    'MONGO_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CHECKIN_SECRET',
    'AI_API_KEY',
    'CODE_RUNNER_API_KEY',
    'SMTP_PASS',
    'WHATSAPP_WEBHOOK_TOKEN',
  ];

  for (const name of secrets) {
    const value = envExampleValue(name);
    assert.notEqual(value, null, `${name} is missing from .env.example`);
    assert.equal(value, '', `${name} must ship blank in .env.example, but ships "${value}"`);
  }
});
