import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateSettingsSchema,
  verifyEmailSchema,
} from '../validators/auth.validators.js';

export const authRoutes = Router();

// Credential endpoints get a much tighter budget than the global API limit.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

/*
 * Requesting a reset link needs a limiter that counts successes, unlike the
 * credential one above. This endpoint answers 200 whether or not the address is
 * registered — deliberately, so it cannot be used to discover who has an
 * account here — and a limiter that skips successful requests would therefore
 * never fire at all, leaving it usable to flood a student's inbox.
 */
const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests, please try again later' },
});

authRoutes.post('/register', credentialLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', credentialLimiter, validate(loginSchema), authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);

/*
 * Unauthenticated by necessity: both exist for someone who cannot sign in.
 * Guessing at a reset token counts as a failure under credentialLimiter, which
 * is the behaviour worth having on the endpoint that consumes one.
 */
authRoutes.post(
  '/password/forgot',
  resetRequestLimiter,
  validate(forgotPasswordSchema),
  authController.requestPasswordReset,
);
authRoutes.post(
  '/password/reset',
  credentialLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

/*
 * Public by necessity and safe for it: the link is opened wherever the mail was
 * read, which is often not a signed-in device. A wrong token counts as a
 * failure under credentialLimiter, so guessing is bounded.
 */
authRoutes.post(
  '/verify-email',
  credentialLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

/*
 * Resending requires a session, unlike requesting a reset. A public endpoint
 * that takes an arbitrary address would be a way to post mail to any student
 * repeatedly, and the reset flow already covers someone who cannot sign in.
 */
authRoutes.post('/verify-email/resend', requireAuth, authController.resendVerification);

authRoutes.get('/me', requireAuth, authController.me);

authRoutes.get('/sessions', requireAuth, authController.listSessions);
authRoutes.delete('/sessions', requireAuth, authController.revokeOtherSessions);

authRoutes.get('/settings', requireAuth, authController.getSettings);
authRoutes.patch(
  '/settings',
  requireAuth,
  validate(updateSettingsSchema),
  authController.updateSettings,
);
authRoutes.patch(
  '/password',
  requireAuth,
  credentialLimiter,
  validate(updatePasswordSchema),
  authController.updatePassword,
);
