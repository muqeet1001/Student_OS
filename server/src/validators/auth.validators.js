import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password,
  role: z.enum(['student', 'admin']).default('student'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  /*
   * Optional only so a student holding an office-issued temporary password can
   * replace it without being asked to prove they know it. The handler decides
   * whether it is required, from `mustChangePassword` — so the field cannot be
   * omitted by simply leaving it out of the request.
   */
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: password,
});

/*
 * Deliberately the same shape as login. A request for an unknown address gets
 * the identical response, so this endpoint cannot be used to find out who has
 * an account here.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, 'This reset link is not valid').max(200),
  newPassword: password,
});

/*
 * The verification token arrives from a URL, so this only checks its shape.
 * Whether it is live, unspent and of the right purpose is decided by the single
 * conditional write that claims it.
 */
export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20, 'This verification link is not valid').max(200),
});

export const updateSettingsSchema = z.object({
  // Keys are validated against the known categories in the service, so an
  // unrecognised one is dropped rather than written to the document.
  notifications: z.record(z.string(), z.boolean()).default({}),
});
