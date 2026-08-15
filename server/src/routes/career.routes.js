import { Router } from 'express';
import * as career from '../controllers/career.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { githubAnalysisSchema, mentorSchema } from '../validators/career.validators.js';

export const careerRoutes = Router();
careerRoutes.use(requireAuth);
careerRoutes.post('/mentor', requireRole('student'), validate(mentorSchema), career.askMentor);
careerRoutes.post(
  '/github-analysis',
  requireRole('student'),
  validate(githubAnalysisSchema),
  career.analyzeGitHub,
);
// Staff keep the shared student navigation and may inspect the explicitly
// opt-in referral directory, but cannot invoke tools as if they were a student.
careerRoutes.get('/alumni', career.alumniNetwork);
