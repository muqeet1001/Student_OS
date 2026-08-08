import { Router } from 'express';

import * as drives from '../controllers/drive.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createDriveSchema,
  shortlistEntrySchema,
  shortlistSchema,
  updateDriveSchema,
} from '../validators/drive.validators.js';

export const driveRoutes = Router();

// Drives expose the whole cohort's data, so staff-only guards the router.
driveRoutes.use(requireAuth, requireRole('admin'));

driveRoutes.get('/', drives.listDrives);
driveRoutes.post('/', validate(createDriveSchema), drives.createDrive);

driveRoutes.get('/:driveId', drives.getDrive);
driveRoutes.patch('/:driveId', validate(updateDriveSchema), drives.updateDrive);
driveRoutes.delete('/:driveId', drives.deleteDrive);

driveRoutes.get('/:driveId/export', drives.exportShortlist);
driveRoutes.post('/:driveId/shortlist', validate(shortlistSchema), drives.addToShortlist);
driveRoutes.patch(
  '/:driveId/shortlist/:studentId',
  validate(shortlistEntrySchema),
  drives.updateShortlistEntry,
);
driveRoutes.delete('/:driveId/shortlist/:studentId', drives.removeFromShortlist);
