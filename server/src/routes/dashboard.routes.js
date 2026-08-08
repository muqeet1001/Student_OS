import { Router } from 'express';

import * as dashboard from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/', dashboard.getDashboard);

const targetRoleSchema = z.object({
  targetRole: z.enum(['frontend', 'backend', 'fullstack', 'data-analyst', 'software-engineer']),
});

dashboardRoutes.patch('/target-role', validate(targetRoleSchema), dashboard.setTargetRole);
