import { Router } from 'express';

import * as calendar from '../controllers/calendar.controller.js';
import { makeCheckinHandler, makeCodeHandler } from '../controllers/checkin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createEventSchema,
  generateSlotsSchema,
  updateEventSchema,
  updateSlotSchema,
} from '../validators/calendar.validators.js';
import { checkinSchema } from '../validators/checkin.validators.js';

export const calendarRoutes = Router();

calendarRoutes.use(requireAuth);

// Every student can read their own agenda; the rest of the calendar, which
// exposes the whole cohort's slots, is staff only.
calendarRoutes.get('/me', calendar.myAgenda);

// Students present a code; only staff can generate one.
calendarRoutes.post('/:id/checkin', validate(checkinSchema), makeCheckinHandler('event'));
calendarRoutes.get('/:id/checkin-code', requireRole('admin'), makeCodeHandler('event'));

calendarRoutes.get('/', requireRole('admin'), calendar.listEvents);
calendarRoutes.post('/', requireRole('admin'), validate(createEventSchema), calendar.createEvent);
calendarRoutes.get('/:eventId', requireRole('admin'), calendar.getEvent);
calendarRoutes.patch(
  '/:eventId',
  requireRole('admin'),
  validate(updateEventSchema),
  calendar.updateEvent,
);
calendarRoutes.delete('/:eventId', requireRole('admin'), calendar.deleteEvent);

calendarRoutes.post(
  '/:eventId/schedule',
  requireRole('admin'),
  validate(generateSlotsSchema),
  calendar.scheduleFromShortlist,
);

calendarRoutes.patch(
  '/:eventId/slots/:slotId',
  requireRole('admin'),
  validate(updateSlotSchema),
  calendar.updateSlot,
);
