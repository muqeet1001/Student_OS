import { z } from 'zod';

export const listProblemsQuery = z.object({
  search: z.string().trim().max(120).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  topic: z.string().trim().max(60).optional(),
  company: z.string().trim().max(60).optional(),
  status: z.enum(['solved', 'unsolved']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const runCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Write some code before running it')
    .max(60_000, 'That submission is too large'),
  language: z.enum(['javascript']).default('javascript'),
});
