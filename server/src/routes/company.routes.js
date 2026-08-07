import { Router } from 'express';

import * as companies from '../controllers/company.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const companyRoutes = Router();

companyRoutes.use(requireAuth);

companyRoutes.get('/', companies.listCompanies);
companyRoutes.get('/:slug', companies.getCompanyHub);
