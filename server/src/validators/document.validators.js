import { z } from 'zod';
import { DOCUMENT_KINDS } from '../models/Document.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const uploadDocumentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS.map((kind) => kind.key)),
  title: z.string().trim().max(160).optional(),
  // Present only when staff file a document on a student's behalf.
  owner: objectId.optional(),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected']),
  reviewNote: z.string().max(1000).optional(),
});
