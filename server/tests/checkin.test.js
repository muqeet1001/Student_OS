import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PERIOD_SECONDS,
  checkinWindow,
  currentCode,
  verifyCode,
  __testing,
} from '../src/services/checkinToken.js';

const { ALPHABET, CODE_LENGTH } = __testing;

const SECRET = 'test-secret';
const SUBJECT = '65f000000000000000000001';
const OTHER = '65f000000000000000000002';

/** Midway through a window, so tests are not sitting on a boundary. */
const T = new Date('2026-03-01T10:00:15Z').getTime();

const at = (iso) => new Date(iso).getTime();

test('a code is drawn only from the unambiguous alphabet', () => {
  const { code } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(code.length, CODE_LENGTH);
  assert.ok(
    [...code].every((character) => ALPHABET.includes(character)),
    'the code gets read aloud and typed, so no 0/O or 1/I/L',
  );
  assert.equal(/[01OIL]/.test(ALPHABET), false);
});

test('the same window always yields the same code', () => {
  const a = currentCode(SUBJECT, SECRET, { now: T });
  const b = currentCode(SUBJECT, SECRET, { now: T + 5000 });

  assert.equal(a.code, b.code, 'the projector must not flicker between polls');
});

/** The whole point: a photographed code has to stop working. */
test('the code changes once the window rolls over', () => {
  const before = currentCode(SUBJECT, SECRET, { now: T });
  const after = currentCode(SUBJECT, SECRET, { now: T + DEFAULT_PERIOD_SECONDS * 1000 });

  assert.notEqual(before.code, after.code);
});

test('a code from one session cannot check in to another', () => {
  const mine = currentCode(SUBJECT, SECRET, { now: T }).code;

  assert.equal(verifyCode(mine, SUBJECT, SECRET, { now: T }), true);
  assert.equal(
    verifyCode(mine, OTHER, SECRET, { now: T }),
    false,
    "this morning's workshop code must not open this afternoon's drive",
  );
});

test('a code does not survive a different secret', () => {
  const code = currentCode(SUBJECT, SECRET, { now: T }).code;

  assert.equal(verifyCode(code, SUBJECT, 'a-different-secret', { now: T }), false);
});

test('the current code verifies', () => {
  const { code } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(verifyCode(code, SUBJECT, SECRET, { now: T }), true);
});

/**
 * Phone clocks, the projector's refresh and the server all disagree by a few
 * seconds. Failing on the boundary would put a queue at the front of the hall.
 */
test('the adjacent windows are accepted for clock skew', () => {
  const period = DEFAULT_PERIOD_SECONDS * 1000;
  const { code } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(verifyCode(code, SUBJECT, SECRET, { now: T + period }), true, 'one window late');
  assert.equal(verifyCode(code, SUBJECT, SECRET, { now: T - period }), true, 'one window early');
});

test('a code two windows old is dead', () => {
  const period = DEFAULT_PERIOD_SECONDS * 1000;
  const { code } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(
    verifyCode(code, SUBJECT, SECRET, { now: T + 2 * period }),
    false,
    'a screenshot forwarded on WhatsApp is stale within about a minute',
  );
});

test('a shared code is useless within two minutes', () => {
  // The claim made in the docs, pinned as a test so it cannot quietly stop
  // being true if someone widens the tolerance.
  const { code } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(verifyCode(code, SUBJECT, SECRET, { now: T + 120_000 }), false);
});

test('codes are accepted case-insensitively and with stray whitespace', () => {
  const { code } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(verifyCode(code.toLowerCase(), SUBJECT, SECRET, { now: T }), true);
  assert.equal(verifyCode(`  ${code}  `, SUBJECT, SECRET, { now: T }), true);
});

test('a wrong code of the right shape is rejected', () => {
  const wrong = ALPHABET.slice(0, CODE_LENGTH);

  // Vanishingly unlikely to collide, but assert against the real code anyway.
  const { code } = currentCode(SUBJECT, SECRET, { now: T });
  if (wrong !== code) {
    assert.equal(verifyCode(wrong, SUBJECT, SECRET, { now: T }), false);
  }
});

test('codes of the wrong length are rejected without throwing', () => {
  for (const value of ['', 'ABC', 'ABCDEFGHIJKLMNOP']) {
    assert.equal(verifyCode(value, SUBJECT, SECRET, { now: T }), false);
  }
});

/**
 * timingSafeEqual throws when byte lengths differ. Eight accented characters
 * are eight characters long and sixteen bytes, so a length-only guard would
 * turn crafted input into a 500.
 */
test('a multi-byte string of the right character length cannot crash the check', () => {
  assert.equal(verifyCode('ÉÉÉÉÉÉÉÉ', SUBJECT, SECRET, { now: T }), false);
  assert.equal(verifyCode('🙂🙂🙂🙂', SUBJECT, SECRET, { now: T }), false);
  assert.equal(verifyCode('ABCD１２３４', SUBJECT, SECRET, { now: T }), false);
});

test('characters outside the alphabet are rejected', () => {
  // 0, O, 1, I and L are excluded by design, so they can never be valid.
  assert.equal(verifyCode('00000000', SUBJECT, SECRET, { now: T }), false);
  assert.equal(verifyCode('OOOOOOOO', SUBJECT, SECRET, { now: T }), false);
  assert.equal(verifyCode('!@#$%^&*', SUBJECT, SECRET, { now: T }), false);
});

test('null and undefined are rejected rather than throwing', () => {
  assert.equal(verifyCode(null, SUBJECT, SECRET, { now: T }), false);
  assert.equal(verifyCode(undefined, SUBJECT, SECRET, { now: T }), false);
  assert.equal(verifyCode({}, SUBJECT, SECRET, { now: T }), false);
});

test('generating a code without a subject or secret is refused loudly', () => {
  // Silently deriving from an empty string would make every session share
  // one code, which is the exact failure this design exists to avoid.
  assert.throws(() => currentCode('', SECRET), /subject/);
  assert.throws(() => currentCode(SUBJECT, ''), /secret/);
});

test('the code reports when it dies, and the countdown is sane', () => {
  const { expiresAt, secondsRemaining, periodSeconds } = currentCode(SUBJECT, SECRET, { now: T });

  assert.equal(periodSeconds, DEFAULT_PERIOD_SECONDS);
  assert.ok(secondsRemaining > 0 && secondsRemaining <= DEFAULT_PERIOD_SECONDS);
  assert.ok(expiresAt.getTime() > T);
  assert.ok(expiresAt.getTime() - T <= DEFAULT_PERIOD_SECONDS * 1000);
});

test('different subjects get different codes in the same window', () => {
  assert.notEqual(
    currentCode(SUBJECT, SECRET, { now: T }).code,
    currentCode(OTHER, SECRET, { now: T }).code,
  );
});

// --- the check-in window ------------------------------------------------

const SESSION = { startsAt: at('2026-03-01T10:00:00Z'), endsAt: at('2026-03-01T13:00:00Z') };

test('check-in is open during the session', () => {
  const window = checkinWindow(SESSION, { now: at('2026-03-01T11:00:00Z') });

  assert.equal(window.open, true);
  assert.equal(window.reason, null);
});

test('check-in opens shortly before the session, for the queue at the door', () => {
  assert.equal(checkinWindow(SESSION, { now: at('2026-03-01T09:45:00Z') }).open, true);
  assert.equal(checkinWindow(SESSION, { now: at('2026-03-01T09:00:00Z') }).open, false);
});

test('check-in is not open the day before', () => {
  const window = checkinWindow(SESSION, { now: at('2026-02-28T10:00:00Z') });

  assert.equal(window.open, false);
  assert.equal(window.reason, 'not-yet');
});

/**
 * A window that never closes turns one leaked screenshot into permanent free
 * attendance, and staff do not remember to close things by hand.
 */
test('check-in closes after the session and stays closed', () => {
  assert.equal(checkinWindow(SESSION, { now: at('2026-03-01T13:20:00Z') }).open, true, 'grace');

  const late = checkinWindow(SESSION, { now: at('2026-03-01T14:30:00Z') });
  assert.equal(late.open, false);
  assert.equal(late.reason, 'closed');

  assert.equal(checkinWindow(SESSION, { now: at('2026-03-08T11:00:00Z') }).open, false, 'a week on');
});

test('a session with no end time is treated as an instant, plus the grace period', () => {
  const deadline = { startsAt: at('2026-03-01T17:00:00Z') };

  assert.equal(checkinWindow(deadline, { now: at('2026-03-01T17:10:00Z') }).open, true);
  assert.equal(checkinWindow(deadline, { now: at('2026-03-01T18:30:00Z') }).open, false);
});
