import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { profileRoutes } from './profile.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/profile', profileRoutes);
