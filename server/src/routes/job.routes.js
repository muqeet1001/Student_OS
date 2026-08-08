import { Router } from 'express';

import * as jobs from '../controllers/job.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createJobSchema, trackJobSchema, updateJobSchema } from '../validators/job.validators.js';

export const jobRoutes = Router();

jobRoutes.use(requireAuth);

jobRoutes.get('/', jobs.listJobs);
jobRoutes.get('/top-matches', jobs.topMatches);
jobRoutes.get('/applications', jobs.listApplications);

// Staff-only authoring, before the :jobId routes so the paths above win.
jobRoutes.post('/', requireRole('admin'), validate(createJobSchema), jobs.createJob);
jobRoutes.patch('/:jobId', requireRole('admin'), validate(updateJobSchema), jobs.updateJob);
jobRoutes.delete('/:jobId', requireRole('admin'), jobs.deleteJob);

jobRoutes.get('/:jobId', jobs.getJob);
jobRoutes.post('/:jobId/track', validate(trackJobSchema), jobs.trackJob);
jobRoutes.delete('/:jobId/track', jobs.untrackJob);
