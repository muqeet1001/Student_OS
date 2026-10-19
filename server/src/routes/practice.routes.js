import { Router } from 'express';

import * as practice from '../controllers/practice.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const practiceRoutes = Router();

practiceRoutes.use(requireAuth);

practiceRoutes.get('/track', practice.getTrack);
