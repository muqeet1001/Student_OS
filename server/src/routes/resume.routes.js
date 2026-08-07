import { Router } from 'express';

import * as resumes from '../controllers/resume.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createResumeSchema, updateResumeSchema } from '../validators/resume.validators.js';

export const resumeRoutes = Router();

resumeRoutes.use(requireAuth);

resumeRoutes.get('/builder', resumes.getBuilder);

resumeRoutes.get('/', resumes.listResumes);
resumeRoutes.post('/', validate(createResumeSchema), resumes.createResume);

resumeRoutes.get('/:resumeId', resumes.getResume);
resumeRoutes.patch('/:resumeId', validate(updateResumeSchema), resumes.updateResume);
resumeRoutes.post('/:resumeId/refresh', resumes.refreshResume);
resumeRoutes.delete('/:resumeId', resumes.deleteResume);
