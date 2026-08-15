import { z } from 'zod';

export const requestReviewSchema = z.object({
  kind: z.enum(['profile', 'resume', 'interview', 'project']),
  resourceId: z.string().trim().max(100).default(''),
  note: z.string().trim().max(1000).default(''),
});

export const completeReviewSchema = z.object({
  feedback: z.string().trim().min(10, 'Feedback should give the student something actionable').max(4000),
});
