import { z } from 'zod';

export const mentorSchema = z.object({
  message: z.string().trim().min(3).max(1000),
});

export const githubAnalysisSchema = z.object({
  repoUrl: z.string().trim().url().max(300),
});
