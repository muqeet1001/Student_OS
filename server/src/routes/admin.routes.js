import { Router } from 'express';

import * as admin from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRoutes = Router();

// Every route here exposes other students' data, so the role check guards
// the whole router rather than each handler.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/students', admin.listStudents);
adminRoutes.get('/students/filters', admin.getFilters);
adminRoutes.get('/students/:studentId', admin.getStudent);
