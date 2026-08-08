import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    type: z
      .enum(['drive', 'test', 'interview', 'pre-placement-talk', 'training', 'deadline'])
      .default('drive'),
    company: z.string().trim().max(120).optional(),
    drive: objectId.optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    venue: z.string().trim().max(160).optional(),
    description: z.string().max(4000).optional(),
    audience: z.enum(['college', 'shortlist', 'selected']).default('shortlist'),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).default('scheduled'),
  })
  // Caught here as well as in the model so the officer gets a field error on
  // the form rather than a 500 from Mongoose.
  .refine((value) => value.endsAt >= value.startsAt, {
    message: 'An event cannot end before it starts.',
    path: ['endsAt'],
  });

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    type: z
      .enum(['drive', 'test', 'interview', 'pre-placement-talk', 'training', 'deadline'])
      .optional(),
    company: z.string().trim().max(120).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    venue: z.string().trim().max(160).optional(),
    description: z.string().max(4000).optional(),
    audience: z.enum(['college', 'shortlist', 'selected']).optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt >= value.startsAt, {
    message: 'An event cannot end before it starts.',
    path: ['endsAt'],
  });

/** Auto-schedules a drive's shortlist into slots. */
export const generateSlotsSchema = z.object({
  startsAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(5).max(240).default(30),
  panels: z.coerce.number().int().min(1).max(20).default(1),
  venue: z.string().trim().max(160).optional(),
  // Which shortlist stages to schedule. Defaults to everyone still in the
  // running, since scheduling a rejected candidate is never intended.
  stages: z
    .array(z.enum(['shortlisted', 'assessment', 'interview', 'selected']))
    .nonempty()
    .default(['shortlisted', 'assessment', 'interview']),
});

export const updateSlotSchema = z.object({
  status: z.enum(['scheduled', 'attended', 'no-show', 'cancelled']).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  panel: z.coerce.number().int().min(1).max(20).optional(),
  venue: z.string().trim().max(160).optional(),
  notes: z.string().max(1000).optional(),
});
