import { Router } from 'express';

import * as documents from '../controllers/document.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadDocumentFile } from '../middleware/upload.js';
import {
  listDocumentsSchema,
  reviewDocumentSchema,
  uploadDocumentSchema,
} from '../validators/document.validators.js';

export const documentRoutes = Router();

documentRoutes.use(requireAuth);

documentRoutes.get('/', validate(listDocumentsSchema, 'query'), documents.listDocuments);

// The multipart parse has to run before validation, or the body is empty.
documentRoutes.post(
  '/',
  uploadDocumentFile,
  validate(uploadDocumentSchema),
  documents.uploadDocument,
);

documentRoutes.get('/:documentId/download', documents.downloadDocument);
documentRoutes.delete('/:documentId', documents.deleteDocument);

documentRoutes.patch(
  '/:documentId/review',
  requireRole('admin'),
  validate(reviewDocumentSchema),
  documents.reviewDocument,
);
