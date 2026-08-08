import { z } from 'zod';

export const checkinSchema = z.object({
  // Length and alphabet are enforced again in verifyCode; this only keeps
  // obviously malformed bodies away from the HMAC work.
  code: z.string().trim().min(4).max(16),
});
