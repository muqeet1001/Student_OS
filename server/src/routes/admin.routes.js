import { Router } from 'express';

import * as admin from '../controllers/admin.controller.js';
import * as match from '../controllers/match.controller.js';
import { validate } from '../middleware/validate.js';
import { matchSchema } from '../validators/match.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRoutes = Router();

// Every route here exposes other students' data, so the role check guards
// the whole router rather than each handler.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/analytics', admin.getAnalytics);
adminRoutes.get('/students/export', admin.exportStudents);
adminRoutes.get('/students', admin.listStudents);
adminRoutes.post('/match', validate(matchSchema), match.matchStudents);
adminRoutes.get('/students/filters', admin.getFilters);
adminRoutes.get('/students/:studentId', admin.getStudent);
