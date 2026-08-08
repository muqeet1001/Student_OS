import { z } from 'zod';

export const matchSchema = z.object({
  // Long enough for a full JD, bounded so a paste cannot push megabytes
  // through the parser.
  description: z.string().trim().min(20, 'Paste the job description').max(20_000),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branch: z.string().trim().max(80).optional(),
  graduationYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const matchMeSchema = matchSchema.pick({ description: true });
