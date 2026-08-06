import { Router } from 'express';
import { authRoutes } from './auth.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
