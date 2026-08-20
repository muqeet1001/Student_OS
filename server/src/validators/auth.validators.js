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
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

export const updateSettingsSchema = z.object({
  // Keys are validated against the known categories in the service, so an
  // unrecognised one is dropped rather than written to the document.
  notifications: z.record(z.string(), z.boolean()).default({}),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  token: z.string().min(1, 'Reset token is required'),
  newPassword: password,
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional(),
});

