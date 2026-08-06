import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as problems from '../controllers/problem.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listProblemsQuery, runCodeSchema } from '../validators/problem.validators.js';

export const problemRoutes = Router();

// Executing code is far more expensive than a read, so it gets its own budget.
const executionLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id ?? req.ip),
  message: { success: false, message: 'You are running code too quickly — take a breath.' },
});

problemRoutes.get('/', optionalAuth, validate(listProblemsQuery, 'query'), problems.listProblems);
problemRoutes.get('/meta/filters', problems.listTopicsAndCompanies);
problemRoutes.get('/stats/me', requireAuth, problems.getCodingStats);
problemRoutes.get('/:slug', optionalAuth, problems.getProblem);

problemRoutes.post(
  '/:slug/run',
  requireAuth,
  executionLimiter,
  validate(runCodeSchema),
  problems.runCode,
);
problemRoutes.post(
  '/:slug/submit',
  requireAuth,
  executionLimiter,
  validate(runCodeSchema),
  problems.submitCode,
);
problemRoutes.get('/:slug/submissions', requireAuth, problems.listSubmissions);
problemRoutes.post('/:slug/bookmark', requireAuth, problems.toggleBookmark);
