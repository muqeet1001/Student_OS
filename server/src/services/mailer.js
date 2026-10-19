import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Email delivery, or an honest admission that there is none.
 *
 * The temptation with a feature like this is to write "Sent to 240 students"
 * whether or not anything left the building. That is the single worst thing
 * this module could do: a placement officer who believes a drive
 * announcement went out, and finds on the morning of the drive that it did
 * not, has been actively harmed by the software.
 *
 * So delivery has exactly two outcomes and they are never conflated. With
 * SMTP configured, messages are sent and the per-recipient result recorded.
 * Without it, they are marked `skipped` with the reason, the announcement
 * still appears in every student's in-app inbox, and the UI says plainly
 * that no email was sent.
 */

/** Built once, lazily — most installations will never configure SMTP. */
let transport;
let transportError = null;

function smtpConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

async function getTransport() {
  if (transport || transportError) return transport;

  try {
    const { default: nodemailer } = await import('nodemailer');

    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  } catch (error) {
    // A missing or broken nodemailer must degrade to "no email", never to a
    // crashed request.
    transportError = error;
    logger.error('SMTP transport could not be created:', error.message);
  }

  return transport;
}

/** Why email is unavailable, in words a placement officer can act on. */
export function mailerStatus() {
  if (!smtpConfigured()) {
    return {
      available: false,
      reason:
        'SMTP is not configured, so no email can be sent. Announcements still reach students in the app. Set SMTP_HOST, SMTP_USER and SMTP_PASS to enable email.',
    };
  }

  if (transportError) {
    return { available: false, reason: `SMTP failed to initialise: ${transportError.message}` };
  }

  return { available: true, reason: null, from: config.smtp.from };
}

/**
 * Sends one message.
 *
 * The transactional counterpart to the bulk sender, and it holds to the same
 * rule: the outcome is reported, never assumed. A caller that needs to tell a
 * student "a reset link is on its way" has to know whether this installation
 * can send email at all, because claiming a delivery that did not happen leaves
 * them waiting for a message that was never sent.
 *
 * Never throws. A failure is a returned status, so one bad address cannot take
 * down the request that triggered it.
 *
 * @returns {Promise<{status: 'sent'|'failed'|'skipped', error?: string}>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const status = mailerStatus();

  if (!status.available) {
    return { status: 'skipped', error: status.reason };
  }

  const mailer = await getTransport();
  if (!mailer) {
    return { status: 'skipped', error: mailerStatus().reason };
  }

  try {
    await mailer.sendMail({ from: config.smtp.from, to, subject, text, html });
    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', error: error.message.slice(0, 200) };
  }
}

/**
 * Sends one message per recipient.
 *
 * Sequential rather than parallel: a college SMTP relay will rate-limit or
 * drop a burst of two hundred simultaneous connections, and a slower send
 * that arrives beats a fast one that gets throttled into the void.
 *
 * Never throws. One bad address must not abort the rest of the batch, so a
 * failure is recorded against that recipient and the loop continues.
 *
 * @returns {Promise<Array<{email: string, status: 'sent'|'failed'|'skipped', error?: string}>>}
 */
export async function sendBulkEmail({ recipients, subject, text, html }) {
  const status = mailerStatus();

  // Decided once for the whole batch: when email is unavailable every recipient
  // is `skipped` with the same reason, and no transport is ever built.
  if (!status.available) {
    return recipients.map((recipient) => ({
      email: recipient.email,
      status: 'skipped',
      error: status.reason,
    }));
  }

  const results = [];

  for (const recipient of recipients) {
    const result = await sendEmail({ to: recipient.email, subject, text, html });
    results.push({ email: recipient.email, ...result });
  }

  return results;
}

/** Counts a delivery report into the three states that matter. */
export function summariseDelivery(results) {
  const count = (status) => results.filter((result) => result.status === status).length;

  return {
    total: results.length,
    sent: count('sent'),
    failed: count('failed'),
    skipped: count('skipped'),
  };
}
