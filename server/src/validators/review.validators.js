import { z } from 'zod';

export const requestReviewSchema = z.object({
  kind: z.enum(['profile', 'resume', 'interview', 'project', 'readiness']),
  resourceId: z.string().trim().max(100).default(''),
  note: z.string().trim().max(1000).default(''),
});

export const reviewMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const completeReviewSchema = z.object({
  feedback: z.string().trim().min(10, 'Feedback should give the student something actionable').max(4000),
});
