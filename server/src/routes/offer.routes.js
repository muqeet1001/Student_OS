import { Router } from 'express';

import * as offers from '../controllers/offer.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOfferSchema, updateOfferSchema } from '../validators/offer.validators.js';

export const offerRoutes = Router();

// Offers and placement reports cover the whole cohort, so staff only.
offerRoutes.use(requireAuth, requireRole('admin'));

offerRoutes.get('/report', offers.placementReport);
offerRoutes.get('/', offers.listOffers);
offerRoutes.post('/', validate(createOfferSchema), offers.createOffer);
offerRoutes.patch('/:offerId', validate(updateOfferSchema), offers.updateOffer);
offerRoutes.delete('/:offerId', offers.deleteOffer);
