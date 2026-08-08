import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  updateSettingsSchema,
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

authRoutes.post('/register', credentialLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', credentialLimiter, validate(loginSchema), authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);

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
