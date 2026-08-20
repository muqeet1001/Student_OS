import { Router } from 'express';
import * as journey from '../controllers/journey.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  actionMessageSchema,
  actionSchema,
  bulkActionSchema,
  consentSchema,
  institutionSchema,
  mentorRequestSchema,
  mentorUpdateSchema,
  onboardingSchema,
  preferencesSchema,
  sisSyncSchema,
  updateActionSchema,
} from '../validators/journey.validators.js';

export const journeyRoutes = Router();
journeyRoutes.use(requireAuth);

journeyRoutes.get('/', journey.getJourney);
journeyRoutes.put('/onboarding', requireRole('student'), validate(onboardingSchema), journey.completeOnboarding);
journeyRoutes.patch('/preferences', requireRole('student'), validate(preferencesSchema), journey.updatePreferences);
journeyRoutes.post('/consents', requireRole('student'), validate(consentSchema), journey.recordConsent);
journeyRoutes.get('/action-center', requireRole('student'), journey.getActionCenter);
journeyRoutes.get('/benchmarks', requireRole('student'), journey.getBenchmarks);
journeyRoutes.get('/calendar.ics', requireRole('student'), journey.exportCalendar);
journeyRoutes.post('/actions', validate(actionSchema), journey.createAction);
journeyRoutes.post('/actions/bulk', requireRole('admin'), validate(bulkActionSchema), journey.createBulkActions);
journeyRoutes.patch('/actions/:actionId', validate(updateActionSchema), journey.updateAction);
journeyRoutes.post('/actions/:actionId/messages', validate(actionMessageSchema), journey.addActionMessage);
journeyRoutes.post('/mentoring', requireRole('student'), validate(mentorRequestSchema), journey.requestMentor);

journeyRoutes.get('/staff', requireRole('admin'), journey.listStaffActions);
journeyRoutes.patch('/mentoring/:appointmentId', requireRole('admin'), validate(mentorUpdateSchema), journey.updateMentor);
journeyRoutes.get('/institution', journey.getInstitution);
journeyRoutes.patch('/institution', requireRole('admin'), validate(institutionSchema), journey.updateInstitution);
journeyRoutes.get('/sis/export.csv', requireRole('admin'), journey.exportSisRoster);
journeyRoutes.post('/sis/sync', requireRole('admin'), validate(sisSyncSchema), journey.syncSisRoster);
