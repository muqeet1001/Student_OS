import { Router } from 'express';

import * as interviews from '../controllers/interview.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { startInterviewSchema, submitAnswerSchema } from '../validators/interview.validators.js';

export const interviewRoutes = Router();

interviewRoutes.use(requireAuth);

interviewRoutes.get('/', interviews.listSessions);
interviewRoutes.post('/', validate(startInterviewSchema), interviews.startSession);

interviewRoutes.get('/:sessionId', interviews.getSession);
interviewRoutes.post('/:sessionId/answer', validate(submitAnswerSchema), interviews.submitAnswer);
interviewRoutes.post('/:sessionId/complete', interviews.completeSession);
