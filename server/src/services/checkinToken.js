import crypto from 'node:crypto';

/**
 * Rotating check-in codes.
 *
 * A static QR code on a projector is worth nothing: the first student in the
 * room photographs it and sends it to everyone still in bed. So the code is
 * derived from the current time in short windows, TOTP-style, and the
 * projector regenerates it as it expires.
 *
 * What this actually buys, stated plainly because attendance data gets used
 * to fail people: a photographed code stops working within about a minute,
 * which defeats casual sharing over WhatsApp. It does NOT defeat a live
 * relay — a student in the room reading the code out on a call to a friend
 * outside will get them marked present. Nothing short of scanning student
 * ID cards at a door fixes that, and this is not that.
 *
 * The remaining guard is the roll: only students already enrolled on the
 * session can check in at all, so a leaked code cannot conjure attendance
 * for someone who was never invited.
 */

/** No 0/O/1/I/L: the code has to survive being read aloud and typed by hand. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

const CODE_LENGTH = 8;

/** Short enough that a screenshot is stale before it can be forwarded. */
export const DEFAULT_PERIOD_SECONDS = 30;

/**
 * Accept the previous and next window as well as the current one.
 *
 * A student's phone clock, the projector's refresh and the server can all
 * disagree by a few seconds, and a code that fails because someone scanned
 * on the boundary would have people queueing at the front of the hall.
 */
const DEFAULT_TOLERANCE = 1;

function windowAt(now, periodSeconds) {
  return Math.floor(now / (periodSeconds * 1000));
}

/**
 * Derives the code for one time window.
 *
 * The subject id is inside the HMAC, so a code from this morning's workshop
 * cannot be used to check in to this afternoon's drive.
 */
function codeFor(subjectId, secret, counter) {
  const mac = crypto
    .createHmac('sha256', secret)
    .update(`${subjectId}:${counter}`)
    .digest();

  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[mac[i] % ALPHABET.length];
  }
  return code;
}

/**
 * The code to display right now, and when it dies.
 *
 * @returns {{code: string, expiresAt: Date, periodSeconds: number, secondsRemaining: number}}
 */
export function currentCode(subjectId, secret, { now = Date.now(), periodSeconds = DEFAULT_PERIOD_SECONDS } = {}) {
  if (!subjectId) throw new Error('A check-in code needs a subject.');
  if (!secret) throw new Error('A check-in code needs a secret.');

  const counter = windowAt(now, periodSeconds);
  const expiresAt = new Date((counter + 1) * periodSeconds * 1000);

  return {
    code: codeFor(subjectId, secret, counter),
    expiresAt,
    periodSeconds,
    secondsRemaining: Math.ceil((expiresAt.getTime() - now) / 1000),
  };
}

/**
 * Checks a code presented by a student.
 *
 * Compared in constant time. The window is small and the alphabet is 30
 * characters, so guessing is not a realistic attack, but a timing side
 * channel is free to close and embarrassing to leave open.
 */
export function verifyCode(
  presented,
  subjectId,
  secret,
  { now = Date.now(), periodSeconds = DEFAULT_PERIOD_SECONDS, tolerance = DEFAULT_TOLERANCE } = {},
) {
  const value = String(presented ?? '').trim().toUpperCase();

  /*
   * Shape is checked against the alphabet, not just the length. A string of
   * eight accented characters is eight characters long but sixteen bytes,
   * and timingSafeEqual throws on a length mismatch — so a length-only guard
   * turns crafted input into a 500. Rejecting anything outside the alphabet
   * is both the correct answer and the safe one.
   */
  if (value.length !== CODE_LENGTH) return false;
  if (![...value].every((character) => ALPHABET.includes(character))) return false;

  const presentedBuffer = Buffer.from(value, 'ascii');
  const counter = windowAt(now, periodSeconds);
  let matched = false;

  for (let offset = -tolerance; offset <= tolerance; offset += 1) {
    const candidate = Buffer.from(codeFor(subjectId, secret, counter + offset), 'ascii');

    // Every window is checked even after a match, so the time taken does not
    // reveal which one hit.
    matched = crypto.timingSafeEqual(candidate, presentedBuffer) || matched;
  }

  return matched;
}

/**
 * Whether check-in should be open at all.
 *
 * Bounded either side of the session rather than open forever: a code that
 * works a week later turns a leaked screenshot into permanent free
 * attendance, and staff forget to close things manually.
 */
export function checkinWindow({ startsAt, endsAt }, { now = Date.now(), earlyMinutes = 30, lateMinutes = 30 } = {}) {
  const opens = new Date(startsAt).getTime() - earlyMinutes * 60_000;
  const closes = new Date(endsAt ?? startsAt).getTime() + lateMinutes * 60_000;

  return {
    open: now >= opens && now <= closes,
    opens: new Date(opens),
    closes: new Date(closes),
    reason: now < opens ? 'not-yet' : now > closes ? 'closed' : null,
  };
}

export const __testing = { ALPHABET, CODE_LENGTH, codeFor, windowAt };
