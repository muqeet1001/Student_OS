import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const consentKey = z.enum([
  'camera-proctoring',
  'public-profile',
  'referrals',
  'email',
  'whatsapp',
  'data-sharing',
]);

export const onboardingSchema = z.object({
  targetRole: z.enum(['frontend', 'backend', 'fullstack', 'data-analyst', 'software-engineer']),
  graduationYear: z.coerce.number().int().min(1950).max(2100),
  branch: z.string().trim().min(1).max(120),
  placementDate: z.coerce.date(),
  weeklyGoal: z.coerce.number().int().min(1).max(20).default(5),
  targetCompanies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  consents: z.array(z.object({ key: consentKey, granted: z.boolean() })).max(6).default([]),
});

export const preferencesSchema = z.object({
  locale: z.enum(['en', 'hi']).optional(),
  channels: z
    .object({
      inApp: z.boolean().optional(),
      email: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
    })
    .optional(),
});

export const consentSchema = z.object({
  key: consentKey,
  granted: z.boolean(),
  source: z.enum(['onboarding', 'settings', 'feature']).default('settings'),
});

export const actionSchema = z.object({
  owner: objectId.optional(),
  category: z.enum(['application', 'preparation', 'document', 'review', 'meeting', 'other']).default('other'),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).default(''),
  dueAt: z.coerce.date().nullable().optional(),
  link: z.string().trim().max(300).default(''),
  reminderChannels: z.array(z.enum(['in-app', 'email', 'whatsapp'])).max(3).default(['in-app']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  signalKey: z.string().trim().max(80).default(''),
});

export const updateActionSchema = z.object({
  status: z.enum(['todo', 'done', 'dismissed']).optional(),
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  link: z.string().trim().max(300).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  staffOwner: objectId.nullable().optional(),
  resolution: z.string().trim().max(1000).optional(),
});

export const actionMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export const bulkActionSchema = actionSchema.omit({ owner: true }).extend({
  owners: z.array(objectId).min(1).max(500),
});

export const mentorRequestSchema = z.object({
  mentor: objectId.optional(),
  mentorName: z.string().trim().max(120).default(''),
  topic: z.string().trim().min(2).max(180),
  note: z.string().trim().max(2000).default(''),
  startsAt: z.coerce.date().nullable().optional(),
});

export const mentorUpdateSchema = z.object({
  status: z.enum(['requested', 'scheduled', 'completed', 'cancelled']),
  startsAt: z.coerce.date().nullable().optional(),
  mentor: objectId.nullable().optional(),
  mentorName: z.string().trim().max(120).optional(),
});

export const institutionSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    placementSeasonName: z.string().trim().max(80).optional(),
    activeGraduationYear: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
    readinessWeights: z
      .object({
        skills: z.number().min(0).max(100),
        coding: z.number().min(0).max(100),
        resume: z.number().min(0).max(100),
        interview: z.number().min(0).max(100),
        projects: z.number().min(0).max(100),
      })
      .refine((weights) => Object.values(weights).reduce((sum, value) => sum + value, 0) === 100, {
        message: 'Readiness weights must total 100',
      })
      .optional(),
    skillTaxonomy: z.array(z.string().trim().min(1).max(60)).max(200).optional(),
    enabledLocales: z.array(z.enum(['en', 'hi'])).min(1).optional(),
    providers: z
      .object({
        email: z.boolean(),
        whatsapp: z.boolean(),
        sis: z.enum(['none', 'csv', 'api']),
      })
      .optional(),
  })
  .strict();

export const sisSyncSchema = z.object({
  rows: z.array(z.object({
    email: z.string().trim().email().max(160),
    externalStudentId: z.string().trim().min(1).max(80),
    name: z.string().trim().min(2).max(80).optional(),
    branch: z.string().trim().min(1).max(120).optional(),
    graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
  })).min(1).max(500),
});
