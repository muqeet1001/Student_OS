import { Router } from 'express';

import * as profile from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadAvatar, uploadCertificate } from '../middleware/upload.js';
import {
  certificationSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
  skillSchema,
  updateAccountSchema,
  updateProfileSchema,
} from '../validators/profile.validators.js';

export const profileRoutes = Router();

profileRoutes.get('/public/:userId', profile.getPublicProfile);

profileRoutes.use(requireAuth);

profileRoutes.get('/me', profile.getMyProfile);
profileRoutes.patch('/me', validate(updateProfileSchema), profile.updateMyProfile);
profileRoutes.patch('/me/account', validate(updateAccountSchema), profile.updateMyAccount);
profileRoutes.post('/me/avatar', uploadAvatar, profile.uploadMyAvatar);

/** Wires POST / PATCH / DELETE for one of the profile's array sections. */
function mountSection(path, schema, handlers) {
  profileRoutes.post(path, validate(schema), handlers.add);
  profileRoutes.patch(`${path}/:itemId`, validate(schema), handlers.update);
  profileRoutes.delete(`${path}/:itemId`, handlers.remove);
}

mountSection('/me/skills', skillSchema, profile.skills);
mountSection('/me/projects', projectSchema, profile.projects);
mountSection('/me/certifications', certificationSchema, profile.certifications);
mountSection('/me/education', educationSchema, profile.education);
mountSection('/me/experience', experienceSchema, profile.experience);

profileRoutes.post(
  '/me/certifications/:itemId/file',
  uploadCertificate,
  profile.uploadCertificateFile,
);
