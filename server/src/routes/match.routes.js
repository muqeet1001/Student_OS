import { Router } from 'express';

import * as match from '../controllers/match.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { matchMeSchema } from '../validators/match.validators.js';

export const matchRoutes = Router();

matchRoutes.use(requireAuth);

/** How well does the signed-in student fit a pasted job description? */
matchRoutes.post('/me', validate(matchMeSchema), match.matchMe);
