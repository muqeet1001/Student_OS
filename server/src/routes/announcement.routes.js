import { Router } from 'express';

import * as announcements from '../controllers/announcement.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  audienceSchema,
  sendAnnouncementSchema,
} from '../validators/announcement.validators.js';

export const announcementRoutes = Router();

announcementRoutes.use(requireAuth);

// A student's own inbox, before the staff-only gate.
announcementRoutes.get('/me', announcements.myAnnouncements);
announcementRoutes.post('/:announcementId/read', announcements.markRead);

announcementRoutes.use(requireRole('admin'));

announcementRoutes.get('/', announcements.listAnnouncements);
announcementRoutes.post('/preview', validate(audienceSchema), announcements.previewAudience);
announcementRoutes.post('/:announcementId/retry', announcements.retryAnnouncement);
announcementRoutes.post('/', validate(sendAnnouncementSchema), announcements.sendAnnouncement);
