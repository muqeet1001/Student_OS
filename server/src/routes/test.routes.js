import { Router } from 'express';

import * as tests from '../controllers/test.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { saveAnswersSchema, submitAttemptSchema } from '../validators/test.validators.js';
import { proctoringViolationSchema } from '../validators/proctoring.validators.js';

export const testRoutes = Router();

testRoutes.use(requireAuth);

testRoutes.get('/', tests.listTests);
testRoutes.get('/attempts', tests.listAttempts);
testRoutes.get('/attempts/:attemptId', tests.getAttempt);

testRoutes.post('/:slug/start', tests.startAttempt);
testRoutes.patch('/attempts/:attemptId/answers', validate(saveAnswersSchema), tests.saveAnswers);
testRoutes.post(
  '/attempts/:attemptId/proctoring/violations',
  validate(proctoringViolationSchema),
  tests.reportProctoringViolation,
);
testRoutes.post('/attempts/:attemptId/submit', validate(submitAttemptSchema), tests.submitAttempt);
