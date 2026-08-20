import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().trim().min(2).max(160),
  company: z.string().trim().min(1).max(120),
  type: z.enum(['full-time', 'internship', 'campus', 'apprenticeship', 'hackathon']).default('full-time'),
  workMode: z.enum(['remote', 'hybrid', 'on-site']).default('on-site'),
  location: z.string().trim().max(160).optional(),
  compensation: z.string().trim().max(120).optional(),
  description: z.string().trim().min(20).max(20_000),
  aboutCompany: z.string().trim().max(4000).optional(),
  applyUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  deadline: z.coerce.date().optional(),
});

export const updateJobSchema = createJobSchema.partial();

export const trackJobSchema = z.object({
  stage: z.enum(['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected']).default('saved'),
  notes: z.string().max(2000).optional(),
  followUpAt: z.coerce.date().nullable().optional(),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  resumeVersion: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resume version').nullable().optional(),
});
