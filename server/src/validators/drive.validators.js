import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const candidateStage = z.enum([
  'invited',
  'applied',
  'shortlisted',
  'assessment',
  'interview',
  'technical-interview',
  'hr-interview',
  'selected',
  'offered',
  'joined',
  'rejected',
  'withdrawn',
]);

const requirementSchema = z.object({
  skills: z.array(z.object({ name: z.string().trim().min(1).max(60), required: z.boolean() })).max(100).optional(),
  minCgpa: z.coerce.number().min(0).max(10).nullable().optional(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
  branches: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  minExperienceYears: z.coerce.number().min(0).max(50).nullable().optional(),
}).partial();

export const createDriveSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  description: z.string().trim().min(20).max(20_000),
  minReadiness: z.coerce.number().int().min(0).max(100).default(0),
  package: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  driveDate: z.coerce.date().optional(),
  applicationDeadline: z.coerce.date().nullable().optional(),
  nextAction: z.string().trim().max(300).optional(),
  nextActionDueAt: z.coerce.date().nullable().optional(),
  status: z.enum(['planned', 'open', 'in-progress', 'closed']).default('planned'),
  requirements: requirementSchema.optional(),
});

export const updateDriveSchema = createDriveSchema.partial();

// Bulk by design: an officer shortlists a whole filtered set at once.
export const shortlistSchema = z.object({
  studentIds: z.array(objectId).min(1).max(500),
  stage: candidateStage.default('shortlisted'),
});

export const shortlistEntrySchema = z.object({
  stage: candidateStage.optional(),
  notes: z.string().max(1000).optional(),
});

export const bulkStageSchema = z.object({
  studentIds: z.array(objectId).min(1).max(500),
  stage: candidateStage,
  note: z.string().trim().max(500).default(''),
});

export const eligibilityOverrideSchema = z.object({
  decision: z.enum(['eligible', 'not-eligible', 'clear']),
  reason: z.string().trim().min(10, 'Explain why the machine decision is being changed.').max(1000),
  originalState: z.enum(['eligible', 'recommended', 'not-eligible', 'needs-verification']),
});
