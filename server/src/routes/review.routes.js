import { Router } from 'express';
import * as reviews from '../controllers/review.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { completeReviewSchema, requestReviewSchema, reviewMessageSchema } from '../validators/review.validators.js';

export const reviewRoutes = Router();
reviewRoutes.use(requireAuth);
reviewRoutes.get('/mine', reviews.listMine);
reviewRoutes.post('/', requireRole('student'), validate(requestReviewSchema), reviews.requestReview);
reviewRoutes.get('/queue', requireRole('admin'), reviews.listQueue);
reviewRoutes.post('/:reviewId/messages', validate(reviewMessageSchema), reviews.addMessage);
reviewRoutes.patch('/:reviewId', requireRole('admin'), validate(completeReviewSchema), reviews.completeReview);
