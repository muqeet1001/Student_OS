import { z } from 'zod';

export const proctoringViolationSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum([
    'camera-stopped',
    'no-face',
    'multiple-faces',
    'excessive-movement',
    'tab-hidden',
    'window-blur',
  ]),
  occurredAt: z.coerce.date().refine(
    (date) => Math.abs(Date.now() - date.getTime()) <= 5 * 60_000,
    'Violation timestamp is outside the accepted window',
  ),
  detail: z.string().trim().max(200).optional(),
});
