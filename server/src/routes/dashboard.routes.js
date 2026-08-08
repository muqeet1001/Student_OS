import { Router } from 'express';

import * as dashboard from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/', dashboard.getDashboard);
