import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const audienceSchema = z.object({
  type: z.enum(['all', 'branch', 'year', 'band', 'drive', 'selected']),
  branch: z.string().trim().max(120).optional(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
  band: z.enum(['ready', 'progressing', 'at-risk']).optional(),
  drive: objectId.optional(),
  students: z.array(objectId).max(2000).optional(),
});

export const sendAnnouncementSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  audience: audienceSchema,
});
