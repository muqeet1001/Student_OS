import { Router } from 'express';
import { adminRoutes } from './admin.routes.js';
import { authRoutes } from './auth.routes.js';
import { companyRoutes } from './company.routes.js';
import { matchRoutes } from './match.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { interviewRoutes } from './interview.routes.js';
import { problemRoutes } from './problem.routes.js';
import { profileRoutes } from './profile.routes.js';
import { questionRoutes } from './question.routes.js';
import { resumeRoutes } from './resume.routes.js';
import { testRoutes } from './test.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/profile', profileRoutes);
routes.use('/problems', problemRoutes);
routes.use('/questions', questionRoutes);
routes.use('/tests', testRoutes);
routes.use('/interviews', interviewRoutes);
routes.use('/resumes', resumeRoutes);
routes.use('/dashboard', dashboardRoutes);
routes.use('/companies', companyRoutes);
routes.use('/match', matchRoutes);
routes.use('/admin', adminRoutes);
