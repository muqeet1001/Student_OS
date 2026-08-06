import { Router } from 'express';

import * as questions from '../controllers/question.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listQuestionsQuery, setProgressSchema } from '../validators/question.validators.js';

export const questionRoutes = Router();

questionRoutes.get('/', optionalAuth, validate(listQuestionsQuery, 'query'), questions.listQuestions);
questionRoutes.get('/meta/filters', questions.listFilters);
questionRoutes.get('/:id', optionalAuth, questions.getQuestion);

questionRoutes.put(
  '/:id/progress',
  requireAuth,
  validate(setProgressSchema),
  questions.setProgress,
);
questionRoutes.post('/:id/bookmark', requireAuth, questions.toggleBookmark);
