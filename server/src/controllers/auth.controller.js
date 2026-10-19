import bcrypt from 'bcryptjs';

import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  REFRESH_COOKIE,
  hashToken,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/token.service.js';
import { mailerStatus, sendEmail } from '../services/mailer.js';
import {
  consumeVerificationToken,
  issueVerificationToken,
  sendVerificationEmail,
  verificationTokenTtlMinutes,
} from '../services/emailVerification.js';
import {
  buildResetUrl,
  consumeResetToken,
  issueResetToken,
  resetTokenTtlMinutes,
  revokeResetTokens,
} from '../services/passwordReset.js';
import { describeUserAgent } from '../services/userAgent.js';
import {
  NOTIFICATION_CATEGORIES,
  defaultPreferences,
  sanitisePreferences,
} from '../services/notificationPreferences.js';
import { logger } from '../utils/logger.js';

const MAX_SESSIONS = 5;

/*
 * A cost-12 hash of a password that has never been issued to anyone.
 *
 * Compared against when no account matches the submitted address, so an
 * unknown email costs the same bcrypt work as a known one. Without it the
 * handler returns in a few milliseconds for an unregistered address and ~100 ms
 * for a registered one, which turns the sign-in form into a way to ask which of
 * a list of addresses have accounts here — exactly what the comment on the
 * handler always claimed was prevented.
 */
const TIMING_EQUALISER = '$2a$12$Zy3aab/AYGbsAV5qmxI/ce/MzOV.FMUXtN5/fNCHmqsaxK6ngDHa2';

/**
 * Issues a token pair, records the refresh token hash against the user and
 * sets the refresh cookie. Old sessions beyond MAX_SESSIONS are evicted.
 */
async function issueSession(user, req, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const { exp } = verifyRefreshToken(refreshToken);
  const now = new Date();

  // A user can sign in or refresh from several tabs at once. Updating the
  // token array atomically avoids stale Mongoose documents overwriting each
  // other (or throwing VersionError) while still enforcing the session cap.
  await User.updateOne(
    { _id: user._id },
    {
      $set: { lastLoginAt: now },
      $push: {
        refreshTokens: {
          $each: [
            {
              tokenHash: hashToken(refreshToken),
              userAgent: (req.headers['user-agent'] || '').slice(0, 200),
              expiresAt: new Date(exp * 1000),
            },
          ],
          $slice: -MAX_SESSIONS,
        },
      },
    },
  );

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

/**
 * Issues a verification link and sends it, reporting rather than assuming.
 *
 * Never throws. Registration and "resend" both carry on whatever the mailer
 * does, because a student whose relay is misconfigured must still be able to
 * use the account they just created — and verification gates nothing, so
 * failing the request would cost them the signup to enforce nothing.
 *
 * The outcome is logged so an operator can see a relay rejecting every message,
 * which no student would notice until they went looking for a link that was
 * never sent.
 */
async function deliverVerificationEmail(user, req) {
  try {
    const { token } = await issueVerificationToken({
      user,
      userAgent: req.headers['user-agent'],
    });

    const delivery = await sendVerificationEmail(user, token);

    if (delivery.status !== 'sent') {
      logger.warn(
        `Verification email for ${user.email} was not sent (${delivery.status}): ` +
          `${delivery.error ?? 'no reason given'}`,
      );
    }

    return delivery.status;
  } catch (error) {
    logger.error(`Could not issue a verification link for ${user.email}: ${error.message}`);
    return 'failed';
  }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with that email already exists');
  }

  // Role is deliberately not taken from the request: self-service signup can
  // only ever create a student. Admins are seeded or promoted by an admin.
  const user = await User.create({ name, email, password, role: 'student' });
  const accessToken = await issueSession(user, req, res);

  // Fired after the session exists, so the student is signed in whether or not
  // this reaches an inbox.
  await deliverVerificationEmail(user, req);

  res.status(201).json({
    success: true,
    data: { user: user.toJSON(), accessToken },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  /*
   * One comparison whether or not the account exists, against a throwaway hash
   * when it does not. Taking the short path here is measurable from the outside
   * and would reveal which addresses are registered.
   */
  const matches = await bcrypt.compare(password, user?.password ?? TIMING_EQUALISER);

  if (!user || !matches) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  const accessToken = await issueSession(user, req, res);

  res.json({ success: true, data: { user: user.toJSON(), accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Session is no longer valid');

  const presented = hashToken(token);
  const now = new Date();

  // Claim the presented token with one conditional write. If two requests
  // present the same cookie, exactly one rotates it and the other receives a
  // normal expired-session response instead of racing two document saves.
  const claimed = await User.updateOne(
    {
      _id: user._id,
      isActive: true,
      refreshTokens: {
        $elemMatch: { tokenHash: presented, expiresAt: { $gt: now } },
      },
    },
    { $pull: { refreshTokens: { tokenHash: presented } } },
  );

  if (claimed.modifiedCount !== 1) {
    // The token verified but is not on file — it was rotated away or revoked.
    throw ApiError.unauthorized('Session is no longer valid');
  }

  const accessToken = await issueSession(user, req, res);
  res.json({ success: true, data: { user: user.toJSON(), accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (token) {
    const presented = hashToken(token);
    await User.updateOne(
      { 'refreshTokens.tokenHash': presented },
      { $pull: { refreshTokens: { tokenHash: presented } } },
    );
  }

  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.json({ success: true, data: { message: 'Signed out' } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toJSON() } });
});

/**
 * Signed-in devices.
 *
 * The user agent has been recorded against every refresh token since the
 * first release and never shown to anyone. Surfacing it is the difference
 * between a student being able to notice a session they do not recognise and
 * having no way to find out.
 */
export const listSessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshTokens').lean();

  const presented = req.cookies?.[REFRESH_COOKIE]
    ? hashToken(req.cookies[REFRESH_COOKIE])
    : null;

  const now = new Date();

  const sessions = (user.refreshTokens ?? [])
    .filter((entry) => entry.expiresAt > now)
    .map((entry) => ({
      // The hash never leaves the server; the client only needs to tell
      // sessions apart, and an opaque prefix is enough for that.
      id: entry.tokenHash.slice(0, 12),
      device: describeUserAgent(entry.userAgent),
      signedInAt: entry.createdAt ?? null,
      expiresAt: entry.expiresAt,
      current: presented === entry.tokenHash,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || new Date(b.signedInAt) - new Date(a.signedInAt));

  res.json({ success: true, data: { sessions } });
});

/**
 * Signs out everywhere except here.
 *
 * Deliberately all-or-nothing rather than per-session revocation: someone
 * worried enough to open this page wants every other device gone, and
 * picking through a list invites leaving the wrong one behind.
 */
export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshTokens');

  const presented = req.cookies?.[REFRESH_COOKIE]
    ? hashToken(req.cookies[REFRESH_COOKIE])
    : null;

  /*
   * Without the cookie there is no "here" to preserve. Filtering on a null hash
   * kept nothing, so this endpoint used to delete the caller's own refresh token
   * along with every other one — then answer "other sessions signed out" while
   * the access token went on working until it expired. Refusing is the honest
   * outcome: the caller can still revoke everything by signing out and back in.
   */
  if (!presented) {
    throw ApiError.badRequest(
      'This client has no refresh session to keep. Sign in again, then manage devices from a browser.',
    );
  }

  const before = user.refreshTokens.length;
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash === presented);
  await user.save({ validateBeforeSave: false });

  const revoked = before - user.refreshTokens.length;

  res.json({
    success: true,
    data: {
      revoked,
      message: revoked
        ? `${revoked} other ${revoked === 1 ? 'session' : 'sessions'} signed out.`
        : 'No other sessions were signed in.',
    },
  });
});

/** Reads the notification categories and the student's choices. */
export const getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();

  res.json({
    success: true,
    data: {
      categories: NOTIFICATION_CATEGORIES,
      // Merged over the defaults so a category the student has never touched
      // reads as on rather than missing.
      notifications: { ...defaultPreferences(), ...(user.settings?.notifications ?? {}) },
    },
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const clean = sanitisePreferences(req.body.notifications);
  for (const [key, value] of Object.entries(clean)) {
    user.settings.notifications.set(key, value);
  }
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: {
      notifications: {
        ...defaultPreferences(),
        ...Object.fromEntries(user.settings.notifications),
      },
    },
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  if (!user) throw ApiError.unauthorized('Session is no longer valid');

  /*
   * A temporary password issued by the placement office is a credential someone
   * else has seen, so while it is still in place it is not treated as proof of
   * anything and the student is not asked for it. Requiring it would only
   * encourage the office's password to be written down and kept somewhere.
   */
  if (!user.mustChangePassword) {
    if (!currentPassword) throw ApiError.badRequest('Current password is required');
    if (!(await user.comparePassword(currentPassword))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  // Changing the password invalidates every other session.
  user.refreshTokens = [];
  await user.save();

  // A reset link still sitting in an inbox must not be able to undo this.
  await revokeResetTokens(user._id);

  const accessToken = await issueSession(user, req, res);
  res.json({
    success: true,
    data: { user: user.toJSON(), accessToken, message: 'Password updated' },
  });
});

/**
 * Starts a self-service reset.
 *
 * Answers identically whether or not the address is registered — including in
 * the fields it returns. An extra key for a known address, even one as small as
 * a delivery status, would turn this into a way to ask which students have
 * accounts here.
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  const data = {
    message:
      'If that address has an account, a reset link is on its way. It expires shortly, so use it soon.',
    // What this installation can do, not what happened for this address — the
    // same value for every caller, and the actionable part when it says no.
    email: mailerStatus(),
    expiresInMinutes: resetTokenTtlMinutes(),
  };

  if (!user || !user.isActive) {
    return res.json({ success: true, data });
  }

  const { token } = await issueResetToken({ user, userAgent: req.headers['user-agent'] });
  const url = buildResetUrl(token);

  const delivery = await sendEmail({
    to: user.email,
    subject: 'Reset your Student OS password',
    text: [
      `Hello ${user.name},`,
      '',
      'Someone asked to reset the password on your Student OS account.',
      `Open this link to choose a new one. It expires in ${resetTokenTtlMinutes()} minutes and works once:`,
      '',
      url,
      '',
      'If this was not you, nothing has changed and no action is needed — your current password still works.',
    ].join('\n'),
    html: [
      `<p>Hello ${user.name},</p>`,
      '<p>Someone asked to reset the password on your Student OS account.</p>',
      `<p><a href="${url}">Choose a new password</a> — the link expires in ${resetTokenTtlMinutes()} minutes and works once.</p>`,
      '<p>If this was not you, nothing has changed and no action is needed. Your current password still works.</p>',
    ].join(''),
  });

  /*
   * Logged rather than returned. The caller must not learn whether a send was
   * attempted, but an operator has to be able to see a relay rejecting every
   * message — that failure is otherwise invisible until students complain.
   */
  if (delivery.status !== 'sent') {
    logger.warn(
      `Password reset email for ${user.email} was not sent (${delivery.status}): ${delivery.error}`,
    );
  }

  return res.json({ success: true, data });
});

/** Completes a self-service reset by consuming the link's token. */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // Throws unless the token is unused and unexpired. Claiming it is a single
  // conditional write, so two tabs presenting the same link cannot both win.
  const userId = await consumeResetToken(token);

  const user = await User.findById(userId).select('+refreshTokens');
  if (!user || !user.isActive) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  /*
   * Every session goes, not merely the others. Whoever is signed in may be the
   * reason the student is resetting, and the point of the exercise is that the
   * old credential — and anything still holding it — stops working.
   */
  user.refreshTokens = [];
  await user.save();

  /*
   * Signed straight in. They have just proved control of the mailbox and chosen
   * the password, so making them type it again on the next screen adds a step
   * and nothing else.
   */
  const accessToken = await issueSession(user, req, res);

  res.json({
    success: true,
    data: { user: user.toJSON(), accessToken, message: 'Password set. You are signed in.' },
  });
});

/**
 * Confirms an email address from the link in the message.
 *
 * Public, because the point is that the student may be reading the mail on a
 * device where they are not signed in — a phone, a lab machine, a friend's
 * laptop. Requiring a session would mean most links could not be used.
 *
 * The token's purpose is part of the claim, so a password-reset link cannot be
 * spent here even though both live in the same collection.
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const userId = await consumeVerificationToken(req.body.token);

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw ApiError.badRequest(
      'This verification link is invalid or has expired. Request a new one.',
    );
  }

  /*
   * Only the first confirmation sets the date. Clicking the same link twice, or
   * letting a mail client open it in two tabs, must not keep moving the record
   * of when the address was actually proved.
   */
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await user.save();
  }

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      emailVerifiedAt: user.emailVerifiedAt,
      message: 'Email address confirmed.',
    },
  });
});

/**
 * Sends a fresh confirmation link to the signed-in student.
 *
 * Deliberately not a public endpoint taking an arbitrary address: that would be
 * a way to post mail to any student repeatedly, and the forgot-password
 * endpoint already covers someone who is locked out and cannot reach an inbox.
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.unauthorized('Session is no longer valid');

  if (user.emailVerifiedAt) {
    return res.json({
      success: true,
      data: {
        user: user.toJSON(),
        // The installation's capability, never the per-request outcome: a
        // different answer for a real address would leak which addresses exist.
        email: mailerStatus(),
        message: 'This address is already confirmed.',
      },
    });
  }

  const status = await deliverVerificationEmail(user, req);

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      email: mailerStatus(),
      expiresInMinutes: verificationTokenTtlMinutes(),
      message:
        status === 'sent'
          ? 'Confirmation link sent. It can be used once.'
          : 'This installation has no email configured, so no link was delivered. Ask the placement office if you need your address confirmed.',
    },
  });
});
