import { Router } from 'express';

import * as admin from '../controllers/admin.controller.js';
import * as match from '../controllers/match.controller.js';
import { validate } from '../middleware/validate.js';
import { matchSchema } from '../validators/match.validators.js';
import { savedCohortViewSchema, staffRoleSchema } from '../validators/admin.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRoutes = Router();

// Every route here exposes other students' data, so the role check guards
// the whole router rather than each handler.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/overview', admin.getOverview);
adminRoutes.get('/staff', admin.getStaff);
adminRoutes.patch('/staff/:staffId/role', validate(staffRoleSchema), admin.updateStaffRole);
adminRoutes.get('/activity', admin.getActivity);
adminRoutes.get('/analytics', admin.getAnalytics);
// Separate from /analytics so the page renders from real numbers first
// and the written reading arrives after, or not at all.
adminRoutes.get('/analytics/insight', admin.getPlacementInsight);
adminRoutes.get('/students/export', admin.exportStudents);
adminRoutes.get('/students', admin.listStudents);
adminRoutes.get('/students/views', admin.listSavedCohortViews);
adminRoutes.post('/students/views', validate(savedCohortViewSchema), admin.createSavedCohortView);
adminRoutes.delete('/students/views/:viewId', admin.deleteSavedCohortView);
adminRoutes.post('/match', validate(matchSchema), match.matchStudents);
adminRoutes.get('/students/filters', admin.getFilters);
adminRoutes.get('/students/:studentId', admin.getStudent);

/*
 * Credential recovery for a locked-out student.
 *
 * The only staff action that hands out a way into someone else's account, so it
 * is written to the audit trail and the password is returned exactly once
 * rather than being retrievable later.
 */
adminRoutes.post('/students/:studentId/password-reset', admin.resetStudentPassword);
