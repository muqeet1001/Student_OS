import { config } from '../config/env.js';
import { sendEmail } from './mailer.js';
import { claimOneTimeToken, issueOneTimeToken, revokeOneTimeTokens } from './oneTimeToken.js';

/*
 * Proving an email address, so the platform knows the address on a record is
 * one its owner can actually read.
 *
 * That matters most for the flow next door: a self-service password reset is
 * only ever as good as the inbox it lands in, and until an address has been
 * proved, nobody has checked that it works at all.
 *
 * Nothing is gated on verification, deliberately. Locking sign-in behind a
 * confirmed address would immobilise every student on an installation with no
 * mail relay configured — and the placement office can issue a password, but it
 * cannot issue an inbox. So this records a fact and surfaces it; it does not
 * stand in anyone's way.
 */

const PURPOSE = 'email-verification';

/*
 * Longer than a password reset on purpose. A reset link is a way into an
 * account and is worth stealing; this one only asserts that an address is
 * reachable, so it can afford to survive a weekend away from a laptop.
 */
const TTL_MINUTES = config.emailVerification.ttlMinutes;

const INVALID_LINK = 'This verification link is invalid or has expired. Request a new one.';

export function verificationTokenTtlMinutes() {
  return TTL_MINUTES;
}

export async function issueVerificationToken({ user, userAgent = '' }) {
  return issueOneTimeToken({ user, purpose: PURPOSE, ttlMinutes: TTL_MINUTES, userAgent });
}

export async function consumeVerificationToken(rawToken) {
  return claimOneTimeToken({ token: rawToken, purpose: PURPOSE, invalidMessage: INVALID_LINK });
}

export async function revokeVerificationTokens(userId) {
  await revokeOneTimeTokens({ userId, purpose: PURPOSE });
}

export function buildVerificationUrl(token) {
  const base = config.clientUrl.replace(/\/$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Sends the link and reports what the mailer actually did.
 *
 * Returns the delivery status rather than assuming success: with no SMTP
 * configured this comes back `skipped` with a reason, and the caller is
 * expected to pass that on instead of telling a student to check an inbox that
 * was never written to.
 */
export async function sendVerificationEmail(user, token) {
  const url = buildVerificationUrl(token);
  const days = Math.round(TTL_MINUTES / (60 * 24));

  return sendEmail({
    to: user.email,
    subject: 'Confirm your Student OS email address',
    text: [
      `Hello ${user.name},`,
      '',
      'Confirm this address to finish setting up your Student OS account:',
      '',
      url,
      '',
      `The link can be used once and expires in ${days} day(s).`,
      'If you did not create this account, you can ignore this message.',
    ].join('\n'),
    html: `
      <p>Hello ${user.name},</p>
      <p>Confirm this address to finish setting up your Student OS account:</p>
      <p><a href="${url}">Confirm my email address</a></p>
      <p>The link can be used once and expires in ${days} day(s).</p>
      <p>If you did not create this account, you can ignore this message.</p>
    `.trim(),
  });
}
