import { Router } from 'express';

import * as trainings from '../controllers/training.controller.js';
import { makeCheckinHandler, makeCodeHandler } from '../controllers/checkin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTrainingSchema,
  enrolSchema,
  markAttendanceSchema,
  updateTrainingSchema,
} from '../validators/training.validators.js';
import { checkinSchema } from '../validators/checkin.validators.js';

export const trainingRoutes = Router();

trainingRoutes.use(requireAuth);

// Students check themselves in, so this one sits above the staff gate.
trainingRoutes.post('/:id/checkin', validate(checkinSchema), makeCheckinHandler('training'));

// Everything else covers the whole cohort, so staff only.
trainingRoutes.use(requireRole('admin'));

trainingRoutes.get('/:id/checkin-code', makeCodeHandler('training'));

trainingRoutes.get('/', trainings.listTrainings);
trainingRoutes.post('/', validate(createTrainingSchema), trainings.createTraining);

trainingRoutes.get('/:trainingId', trainings.getTraining);
trainingRoutes.patch('/:trainingId', validate(updateTrainingSchema), trainings.updateTraining);
trainingRoutes.delete('/:trainingId', trainings.deleteTraining);

trainingRoutes.post('/:trainingId/enrol', validate(enrolSchema), trainings.enrolStudents);
trainingRoutes.post(
  '/:trainingId/attendance',
  validate(markAttendanceSchema),
  trainings.markAttendance,
);

trainingRoutes.get('/:trainingId/effectiveness', trainings.getEffectiveness);
