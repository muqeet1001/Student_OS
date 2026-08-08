import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createDriveSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  description: z.string().trim().min(20).max(20_000),
  minReadiness: z.coerce.number().int().min(0).max(100).default(0),
  package: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  driveDate: z.coerce.date().optional(),
  status: z.enum(['planned', 'open', 'in-progress', 'closed']).default('planned'),
});

export const updateDriveSchema = createDriveSchema.partial();

// Bulk by design: an officer shortlists a whole filtered set at once.
export const shortlistSchema = z.object({
  studentIds: z.array(objectId).min(1).max(500),
});

export const shortlistEntrySchema = z.object({
  stage: z.enum(['shortlisted', 'assessment', 'interview', 'selected', 'rejected']).optional(),
  notes: z.string().max(1000).optional(),
});
