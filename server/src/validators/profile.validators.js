import { z } from 'zod';

const url = z.string().trim().url('Must be a valid URL').or(z.literal(''));
const year = z.coerce.number().int().min(1950).max(2100);

export const updateProfileSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(32).optional(),
  location: z.string().trim().max(120).optional(),
  graduationYear: year.optional(),
  cgpa: z.coerce.number().min(0).max(10).nullable().optional(),
  branch: z.string().trim().max(120).optional(),
  track: z.enum(['technical', 'management', 'design', 'undecided']).optional(),
  links: z
    .object({
      github: url.optional(),
      linkedin: url.optional(),
      portfolio: url.optional(),
      leetcode: url.optional(),
    })
    .optional(),
  targetRoles: z.array(z.string().trim().max(80)).max(10).optional(),
  targetCompanies: z.array(z.string().trim().max(80)).max(20).optional(),
  publicProfile: z
    .object({
      enabled: z.boolean().optional(),
      openToReferrals: z.boolean().optional(),
    })
    .optional(),
});

export const skillSchema = z.object({
  name: z.string().trim().min(1, 'Skill name is required').max(60),
  category: z
    .enum(['programming', 'frontend', 'backend', 'database', 'cloud', 'soft', 'other'])
    .default('other'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
});

export const projectSchema = z.object({
  title: z.string().trim().min(1, 'Project title is required').max(120),
  description: z.string().trim().max(600).default(''),
  techStack: z.array(z.string().trim().max(40)).max(15).default([]),
  repoUrl: url.default(''),
  liveUrl: url.default(''),
  featured: z.boolean().default(false),
});

export const certificationSchema = z.object({
  kind: z.enum(['certificate', 'hackathon', 'award']).default('certificate'),
  title: z.string().trim().min(1, 'Certification title is required').max(140),
  issuer: z.string().trim().max(120).default(''),
  credentialId: z.string().trim().max(120).default(''),
  credentialUrl: url.default(''),
  issuedAt: z.coerce.date().optional(),
});

export const educationSchema = z
  .object({
    institution: z.string().trim().min(1, 'Institution is required').max(160),
    degree: z.string().trim().max(120).default(''),
    fieldOfStudy: z.string().trim().max(120).default(''),
    startYear: year.optional(),
    endYear: year.optional(),
    grade: z.string().trim().max(40).default(''),
  })
  .refine((data) => !data.startYear || !data.endYear || data.endYear >= data.startYear, {
    message: 'End year cannot be before start year',
    path: ['endYear'],
  });

export const experienceSchema = z
  .object({
    role: z.string().trim().min(1, 'Role is required').max(120),
    company: z.string().trim().max(120).default(''),
    location: z.string().trim().max(120).default(''),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    current: z.boolean().default(false),
    highlights: z.array(z.string().trim().max(300)).max(10).default([]),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(120).optional(),
});
