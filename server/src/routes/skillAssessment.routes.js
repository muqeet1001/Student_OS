import { Router } from 'express';
import { z } from 'zod';

import * as skills from '../controllers/skillAssessment.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { proctoringViolationSchema } from '../validators/proctoring.validators.js';

export const skillAssessmentRoutes = Router();

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const submitSchema = z.object({
  answers: z
    .array(z.object({ question: objectId, selectedOption: objectId.nullable().optional() }))
    .max(100)
    .default([]),
});

skillAssessmentRoutes.use(requireAuth);

skillAssessmentRoutes.get('/', skills.listAssessments);
skillAssessmentRoutes.get('/:skill/history', skills.skillHistory);
skillAssessmentRoutes.post('/:skill/start', skills.startAttempt);
skillAssessmentRoutes.post(
  '/attempts/:attemptId/proctoring/violations',
  validate(proctoringViolationSchema),
  skills.reportProctoringViolation,
);
skillAssessmentRoutes.post('/attempts/:attemptId/submit', validate(submitSchema), skills.submitAttempt);
