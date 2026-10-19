import crypto from 'node:crypto';

import { OneTimeToken } from '../models/OneTimeToken.js';
import { ApiError } from '../utils/ApiError.js';
import { hashToken } from './token.service.js';

/*
 * The mechanics every single-use link in this app shares.
 *
 * Password resets and email verification differ only in what they do once a
 * token is claimed, so the parts that must be right — randomness, hashing,
 * expiry, and the atomic claim that makes a link single-use — live here once.
 *
 * The `purpose` argument is required on every call rather than defaulted. A
 * default would mean a caller that forgets it silently accepts a link issued
 * for the other flow.
 */

/** A token is a credential, so it is random: 256 bits, hex encoded. */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function tokenExpiry(ttlMinutes, from = new Date()) {
  return new Date(from.getTime() + ttlMinutes * 60_000);
}

/**
 * Issues a grant for one account and purpose.
 *
 * Any grant already outstanding for that same purpose is retired first. Two
 * live links for one account means the older one is still a way in, and the
 * person who requested the first has no way to notice the second exists.
 *
 * Grants for the other purpose are deliberately left alone: asking for a
 * password reset must not silently cancel an email verification that is
 * already in flight, because the student holding that link would see it fail
 * for no visible reason.
 */
export async function issueOneTimeToken({ user, purpose, ttlMinutes, userAgent = '' }) {
  const token = generateToken();

  await revokeOneTimeTokens({ userId: user._id, purpose });

  const record = await OneTimeToken.create({
    user: user._id,
    purpose,
    tokenHash: hashToken(token),
    expiresAt: tokenExpiry(ttlMinutes),
    userAgent: String(userAgent ?? '').slice(0, 200),
  });

  return { token, expiresAt: record.expiresAt };
}

/**
 * Claims a token and returns the account it belongs to.
 *
 * A single conditional write rather than a read followed by a save: two
 * requests presenting the same link would otherwise both observe it unused and
 * both proceed, with the second silently overwriting the first. The purpose is
 * part of the filter, so a token issued for one flow cannot be spent on the
 * other.
 *
 * Throws `invalidMessage` for every failure — wrong token, spent token, expired
 * token, wrong purpose. Distinguishing them would tell a caller which of their
 * guesses was closest.
 */
export async function claimOneTimeToken({ token, purpose, invalidMessage }) {
  if (typeof token !== 'string' || !token) throw ApiError.badRequest(invalidMessage);

  const claimed = await OneTimeToken.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true },
  ).lean();

  if (!claimed) throw ApiError.badRequest(invalidMessage);
  return claimed.user;
}

/** Retires every outstanding grant for one account and purpose. */
export async function revokeOneTimeTokens({ userId, purpose }) {
  await OneTimeToken.updateMany(
    { user: userId, purpose, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
}

export const __testing = { generateToken };
