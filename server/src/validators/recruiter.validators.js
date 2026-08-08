import { z } from 'zod';
import { FEEDBACK_TAGS } from '../models/Recruiter.js';

const TAG_KEYS = FEEDBACK_TAGS.map((tag) => tag.key);
const tag = z.enum(TAG_KEYS);

export const createRecruiterSchema = z.object({
  name: z.string().trim().min(1).max(160),
  companySlug: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  website: z.string().trim().max(300).optional(),
  location: z.string().trim().max(160).optional(),
  status: z.enum(['prospect', 'active', 'dormant', 'lost']).default('prospect'),
  typicalCtc: z.coerce.number().min(0).max(100_000_000).optional(),
  notes: z.string().max(4000).optional(),
});

export const updateRecruiterSchema = createRecruiterSchema.partial();

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  designation: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(32).optional(),
  primary: z.boolean().default(false),
});

export const feedbackSchema = z.object({
  drive: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  givenAt: z.coerce.date().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  // Closed vocabularies: a theme nobody can count is a theme nobody can fund.
  strengths: z.array(tag).default([]),
  gaps: z.array(tag).default([]),
  notes: z.string().max(2000).optional(),
});

export const interactionSchema = z.object({
  at: z.coerce.date().optional(),
  type: z.enum(['call', 'email', 'meeting', 'visit', 'other']).default('call'),
  summary: z.string().trim().min(1).max(1000),
});
