import { z } from 'zod';

const sections = z
  .object({
    summary: z.boolean(),
    experience: z.boolean(),
    projects: z.boolean(),
    education: z.boolean(),
    skills: z.boolean(),
    certifications: z.boolean(),
  })
  .partial();

export const createResumeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  targetRole: z.string().trim().max(120).optional(),
  targetCompany: z.string().trim().max(120).optional(),
  template: z.enum(['editorial', 'compact']).default('editorial'),
  // Hex only: the value is interpolated into inline styles on the preview.
  accent: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'Accent must be a hex colour')
    .default('#a83206'),
  sections: sections.optional(),
});

export const updateResumeSchema = createResumeSchema.partial();
