import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildResetUrl,
  consumeResetToken,
  generateResetToken,
  generateTemporaryPassword,
  resetTokenExpiry,
  resetTokenTtlMinutes,
} from '../src/services/passwordReset.js';

/*
 * The reset token and the office-issued temporary password are both credentials
 * that exist in plaintext outside the database — one in an inbox, one on a
 * screen in front of a placement officer reading it down a phone. Neither can
 * be re-derived from what is stored, so these are the only tests that will ever
 * see them, and they have to hold before either is handed to anyone.
 */

test('a reset token is long, random and URL-safe', () => {
  const token = generateResetToken();

  // 32 bytes of entropy, hex encoded. Anything shorter is a token worth
  // guessing at a few hundred requests a second.
  assert.equal(token.length, 64);
  assert.match(token, /^[a-f0-9]{64}$/, 'hex only, so it survives a URL and an email body');

  const hundred = new Set(Array.from({ length: 100 }, () => generateResetToken()));
  assert.equal(hundred.size, 100, 'two requests must never receive the same token');
});

test('a reset link expires on the configured window, not an accidental default', () => {
  const from = new Date('2026-03-01T10:00:00Z');
  const expiry = resetTokenExpiry(from);

  assert.equal(resetTokenTtlMinutes(), 30, 'thirty minutes is the documented default');
  assert.equal(
    expiry.getTime() - from.getTime(),
    resetTokenTtlMinutes() * 60_000,
    'the window is measured in minutes, not in some other unit',
  );

  // The window is short on purpose, but a link that expires in the past or
  // instantly would make the feature useless rather than safe.
  assert.ok(expiry > from);
});

test('the reset link points at the client, with the token escaped', () => {
  const token = generateResetToken();
  const url = new URL(buildResetUrl(token));

  assert.equal(url.pathname, '/reset-password');
  assert.equal(url.searchParams.get('token'), token, 'the token arrives intact after a round trip');
});

test('a temporary password meets the rules the API enforces on chosen ones', () => {
  const password = generateTemporaryPassword();

  // Saved through the same model and compared by the same login path, so a
  // temporary password that could not have been set by the student would be
  // rejected on the way in — a failure that only shows up at the worst moment.
  assert.ok(password.length >= 8, 'the model requires at least 8 characters');
  assert.match(password, /[a-zA-Z]/, 'the validator requires a letter');
  assert.match(password, /[0-9]/, 'the validator requires a number');
  assert.equal(password.length, 16, 'longer than the minimum, because nobody has to remember it');
});

test('a temporary password avoids characters that get misread aloud', () => {
  // Every character is drawn from a set with no 0/O, 1/I/L or o/l — this
  // password is read out over a phone and typed in by someone else, and a
  // single transposition costs a locked-out student another call to the office.
  const drawn = Array.from({ length: 200 }, () => generateTemporaryPassword()).join('');

  for (const ambiguous of ['0', 'O', 'o', '1', 'I', 'l']) {
    assert.ok(
      !drawn.includes(ambiguous),
      `"${ambiguous}" is not distinguishable when read aloud`,
    );
  }
});

test('a temporary password is not a fixed pattern', () => {
  const first = new Set();
  const characters = [];

  for (let i = 0; i < 300; i += 1) {
    const password = generateTemporaryPassword();
    first.add(password[0]);
    characters.push([...password]);
  }

  // The guaranteed letter, digit and symbol are shuffled into place rather than
  // written first. If they were not, every password would open with a letter
  // and a guesser would know where to start.
  const opensWithLetter = characters.filter(([initial]) => /[a-zA-Z]/.test(initial)).length;
  assert.ok(
    opensWithLetter < characters.length,
    'the first character is not always a letter',
  );
  assert.ok(first.size > 20, `the first character varies (saw ${first.size} distinct)`);

  const sequence = characters[0].join('');
  const repeats = characters.filter((entry) => entry.join('') === sequence).length;
  assert.equal(repeats, 1, 'no two draws collide');
});

test('a malformed token is refused without ever reaching the database', async () => {
  // Awaited one at a time rather than fired off together: assert.rejects returns
  // a promise, so an un-awaited call asserts nothing and lets the suite pass
  // while the behaviour it describes is broken.
  for (const malformed of [null, undefined, '', 42, {}]) {
    await assert.rejects(
      () => consumeResetToken(malformed),
      /invalid or has expired/,
      `a ${typeof malformed} token must be rejected as a bad request`,
    );
  }
});
