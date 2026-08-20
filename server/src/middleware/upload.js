import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { deleteFile } from '../services/fileStore.js';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);

function filterFor(allowed) {
  return (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    return cb(null, true);
  };
}

/**
 * Avatars are held in memory only long enough to write to GridFS.
 */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: filterFor(IMAGE_TYPES),
}).single('avatar');

/**
 * Certificates are held in memory only long enough to write to GridFS.
 */
export const uploadCertificate = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: filterFor(DOCUMENT_TYPES),
}).single('file');

/** Public URL for a stored upload. */
export function publicUrlFor(fileId) {
  return `/api/media/${fileId}`;
}

/** Best-effort removal of a previously stored upload (GridFS or legacy disk). */
export function removeUpload(url) {
  if (!url) return;

  if (url.startsWith('/api/media/')) {
    const fileId = url.replace('/api/media/', '').split('/')[0];
    deleteFile(fileId).catch(() => {});
    return;
  }

  if (url.startsWith('/uploads/')) {
    const target = path.join(config.uploadsDir, url.replace('/uploads/', ''));
    if (target.startsWith(config.uploadsDir)) {
      fs.rm(target, { force: true }, () => {});
    }
  }
}

/**
 * Documents go to MongoDB via GridFS, so they are held in memory only long
 * enough to be written — never to the container's filesystem, which is
 * ephemeral on every platform this is likely to be deployed to.
 */
export const uploadDocumentFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: filterFor(DOCUMENT_TYPES),
}).single('file');

