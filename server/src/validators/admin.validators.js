import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const filters = z.object({
  search: z.string().trim().max(120).optional(),
  branch: z.string().trim().max(120).optional(),
  band: z.enum(['ready', 'progressing', 'at-risk', '']).optional(),
  sort: z.enum(['readiness', 'readiness-asc', 'solved', 'name']).optional(),
  minCgpa: z.union([z.number().min(0).max(10), z.literal('')]).optional(),
  minReadiness: z.union([z.number().min(0).max(100), z.literal('')]).optional(),
  minCoding: z.union([z.number().min(0).max(100), z.literal('')]).optional(),
  minAts: z.union([z.number().min(0).max(100), z.literal('')]).optional(),
  minInterview: z.union([z.number().min(0).max(100), z.literal('')]).optional(),
  minVerifiedSkills: z.union([z.number().int().min(0).max(100), z.literal('')]).optional(),
  skill: z.string().trim().max(60).optional(),
  hasProjects: z.boolean().optional(),
  hasCertifications: z.boolean().optional(),
}).strict();

export const savedCohortViewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(['filter', 'candidate-list']).default('filter'),
  filters: filters.default({}),
  students: z.array(objectId).max(500).default([]),
}).superRefine((value, ctx) => {
  if (value.kind === 'candidate-list' && value.students.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['students'], message: 'Select at least one student.' });
  }
});

export const staffRoleSchema = z.object({
  staffRole: z.enum(['placement-head', 'officer', 'faculty-coordinator', 'viewer']),
});
