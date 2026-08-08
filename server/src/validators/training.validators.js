import { z } from 'zod';
import { TARGET_COMPONENTS } from '../models/Training.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createTrainingSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(4000).optional(),
    type: z.enum(['workshop', 'bootcamp', 'seminar', 'mock-drive', 'one-on-one']).default('workshop'),
    targetComponent: z.enum(TARGET_COMPONENTS).nullish(),
    targetSkills: z.array(z.string().trim().max(60)).max(20).default([]),
    trainer: z.string().trim().max(160).optional(),
    provider: z.enum(['internal', 'external']).default('internal'),
    cost: z.coerce.number().min(0).max(100_000_000).nullish(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    venue: z.string().trim().max(160).optional(),
    status: z.enum(['planned', 'running', 'completed', 'cancelled']).default('planned'),
  })
  .refine((value) => value.endsAt >= value.startsAt, {
    message: 'A session cannot end before it starts.',
    path: ['endsAt'],
  });

export const updateTrainingSchema = createTrainingSchema.innerType().partial();

/** Registers students onto a session, or replaces the roll. */
export const enrolSchema = z.object({
  students: z.array(objectId).min(1).max(500),
  /** Replaces the existing roll rather than appending to it. */
  replace: z.boolean().default(false),
});

export const markAttendanceSchema = z.object({
  /** Ids marked present. Everyone else on the roll becomes absent. */
  attended: z.array(objectId).default([]),
});
