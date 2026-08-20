import { Router } from 'express';

import * as recruiters from '../controllers/recruiter.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  contactSchema,
  createRecruiterSchema,
  feedbackSchema,
  interactionSchema,
  updateRecruiterSchema,
} from '../validators/recruiter.validators.js';

export const recruiterRoutes = Router();
export const recruiterPortalRoutes = Router();

recruiterPortalRoutes.get('/:token', recruiters.viewPortal);
recruiterPortalRoutes.post('/:token', validate(feedbackSchema), recruiters.submitPortalFeedback);

// The whole CRM — contacts, private notes, recruiter opinions of the cohort —
// is staff only. None of it is meant for students.
recruiterRoutes.use(requireAuth, requireRole('admin'));

recruiterRoutes.get('/', recruiters.listRecruiters);
recruiterRoutes.post('/', validate(createRecruiterSchema), recruiters.createRecruiter);

recruiterRoutes.get('/:recruiterId', recruiters.getRecruiter);
recruiterRoutes.patch(
  '/:recruiterId',
  validate(updateRecruiterSchema),
  recruiters.updateRecruiter,
);
recruiterRoutes.delete('/:recruiterId', recruiters.deleteRecruiter);
recruiterRoutes.post('/:recruiterId/portal-invite', recruiters.createPortalInvite);

recruiterRoutes.post(
  '/:recruiterId/contacts',
  validate(contactSchema),
  recruiters.addContact,
);
recruiterRoutes.delete('/:recruiterId/contacts/:entryId', recruiters.removeContact);

recruiterRoutes.post(
  '/:recruiterId/feedback',
  validate(feedbackSchema),
  recruiters.addFeedback,
);
recruiterRoutes.delete('/:recruiterId/feedback/:entryId', recruiters.removeFeedback);

recruiterRoutes.post(
  '/:recruiterId/interactions',
  validate(interactionSchema),
  recruiters.addInteraction,
);
