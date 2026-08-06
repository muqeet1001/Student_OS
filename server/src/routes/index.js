import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { problemRoutes } from './problem.routes.js';
import { profileRoutes } from './profile.routes.js';
import { questionRoutes } from './question.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/profile', profileRoutes);
routes.use('/problems', problemRoutes);
routes.use('/questions', questionRoutes);
