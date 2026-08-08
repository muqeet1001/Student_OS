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
import { describeUserAgent } from '../services/userAgent.js';
import {
  NOTIFICATION_CATEGORIES,
  defaultPreferences,
  sanitisePreferences,
} from '../services/notificationPreferences.js';

const MAX_SESSIONS = 5;

/**
 * Issues a token pair, records the refresh token hash against the user and
 * sets the refresh cookie. Old sessions beyond MAX_SESSIONS are evicted.
 */
async function issueSession(user, req, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const { exp } = verifyRefreshToken(refreshToken);

  const account = await User.findById(user._id).select('+refreshTokens');
  const now = new Date();

  account.refreshTokens = [
    ...account.refreshTokens.filter((entry) => entry.expiresAt > now),
    {
      tokenHash: hashToken(refreshToken),
      userAgent: (req.headers['user-agent'] || '').slice(0, 200),
      expiresAt: new Date(exp * 1000),
    },
  ].slice(-MAX_SESSIONS);

  account.lastLoginAt = now;
  await account.save({ validateBeforeSave: false });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
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

  res.status(201).json({
    success: true,
    data: { user: user.toJSON(), accessToken },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  // Compare regardless of whether the user exists so timing does not reveal
  // which emails are registered.
  const matches = user ? await user.comparePassword(password) : false;

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
  const known = user.refreshTokens.some(
    (entry) => entry.tokenHash === presented && entry.expiresAt > new Date(),
  );
  if (!known) {
    // The token verified but is not on file — it was rotated away or revoked.
    throw ApiError.unauthorized('Session is no longer valid');
  }

  // Rotate: drop the presented token before issuing its replacement.
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== presented);
  await user.save({ validateBeforeSave: false });

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

  const before = user.refreshTokens.length;
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash === presented);
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: { revoked: before - user.refreshTokens.length, message: 'Other sessions signed out.' },
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
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  // Changing the password invalidates every other session.
  user.refreshTokens = [];
  await user.save();

  const accessToken = await issueSession(user, req, res);
  res.json({ success: true, data: { accessToken, message: 'Password updated' } });
});
