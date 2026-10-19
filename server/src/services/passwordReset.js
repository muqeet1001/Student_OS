import crypto from 'node:crypto';

import { config } from '../config/env.js';
import {
  claimOneTimeToken,
  generateToken,
  issueOneTimeToken,
  revokeOneTimeTokens,
  tokenExpiry,
} from './oneTimeToken.js';

/** This flow's half of the shared single-use token collection. */
const PURPOSE = 'password-reset';

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.';

/*
 * Password recovery, in two forms.
 *
 * A reset link, for when the installation has SMTP configured and the student
 * can reach their own inbox. And a temporary password the placement office
 * issues, for every other case — a college that has not connected email, a
 * student whose registered address has lapsed, a locked account on the morning
 * of a drive. The office path is not a fallback for a broken feature; it is the
 * one that works with nothing configured at all.
 *
 * Both paths end the same way: every existing session is revoked, and no path
 * ever leaves a single account reachable by a credential someone else chose and
 * still knows.
 */

/** How long a link stays usable. Short, because it is a way into an account. */
const TTL_MINUTES = config.passwordReset.ttlMinutes;

/** A reset token is a credential, so it is random: 256 bits, hex encoded. */
export function generateResetToken() {
  return generateToken();
}

export function resetTokenExpiry(from = new Date()) {
  return tokenExpiry(TTL_MINUTES, from);
}

export function resetTokenTtlMinutes() {
  return TTL_MINUTES;
}

/**
 * Issues a link for one account.
 *
 * Any link already outstanding is retired first. Two live links for one
 * account means the older one is still a way in, and a student who requested
 * the first has no way to notice the second exists.
 */
export async function issueResetToken({ user, userAgent = '' }) {
  return issueOneTimeToken({
    user,
    purpose: PURPOSE,
    ttlMinutes: TTL_MINUTES,
    userAgent,
  });
}

/**
 * Claims a token and returns the account it belongs to.
 *
 * A single conditional write rather than a read followed by a save: two
 * requests presenting the same link would otherwise both observe it unused and
 * both set a password, with the second silently overwriting the first.
 */
export async function consumeResetToken(rawToken) {
  return claimOneTimeToken({ token: rawToken, purpose: PURPOSE, invalidMessage: INVALID_LINK });
}

/** Retires every outstanding reset link for an account. */
export async function revokeResetTokens(userId) {
  await revokeOneTimeTokens({ userId, purpose: PURPOSE });
}

export function buildResetUrl(token) {
  return `${config.clientUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * A temporary password for the office to read out.
 *
 * Generated rather than chosen by the officer. A password a person invents is
 * one they may reuse elsewhere, and letting them pick turns an institution's
 * credential policy into an individual's habits. It is also never stored in
 * plaintext — only the hash the model writes reaches the database, and the
 * plaintext exists only in the one response that displays it.
 */
export function generateTemporaryPassword(length = 16) {
  const LETTERS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const DIGITS = '23456789';
  const SYMBOLS = '!@#$%^&*-_';
  const ALL = LETTERS + DIGITS + SYMBOLS;

  // crypto.randomInt is unbiased, unlike reading a byte and taking a modulus,
  // which favours the start of the alphabet on every draw.
  const pick = (set) => set[crypto.randomInt(set.length)];

  const chars = [pick(LETTERS), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));

  // Shuffled so the guaranteed letter, digit and symbol are not always the
  // first three characters — which is the shape a password-guesser looks for.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
