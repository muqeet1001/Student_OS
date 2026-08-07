import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const startInterviewSchema = z.object({
  round: z.enum(['behavioural', 'technical', 'system-design', 'hr']),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  targetRole: z.string().trim().max(120).optional(),
  questionCount: z.coerce.number().int().min(3).max(10).default(5),
});

export const submitAnswerSchema = z
  .object({
    questionId: objectId,
    // Long enough for a thorough spoken answer, bounded so a paste cannot
    // push megabytes through the analyzer.
    answer: z.string().max(8000).default(''),
    secondsTaken: z.coerce.number().int().min(0).max(3600).default(0),
    skipped: z.boolean().default(false),
  })
  .refine((value) => value.skipped || value.answer.trim().length > 0, {
    message: 'An answer is required unless the question is skipped.',
    path: ['answer'],
  });
