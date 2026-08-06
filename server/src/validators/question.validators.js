import { z } from 'zod';

export const listQuestionsQuery = z.object({
  search: z.string().trim().max(120).optional(),
  company: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  topic: z.string().trim().max(60).optional(),
  round: z
    .enum(['online-assessment', 'technical', 'system-design', 'hr', 'group-discussion', 'other'])
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['solved', 'unsolved']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const setProgressSchema = z.object({
  // `null` clears any existing progress for the question.
  status: z.enum(['solved', 'revisit']).nullable(),
  notes: z.string().max(2000).optional(),
});
