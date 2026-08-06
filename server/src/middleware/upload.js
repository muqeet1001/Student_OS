import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);

function storageFor(folder) {
  const destination = path.join(config.uploadsDir, folder);
  fs.mkdirSync(destination, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      // Never trust the client filename — derive a random one and keep only
      // the extension, so nothing can be written outside the uploads folder.
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function filterFor(allowed) {
  return (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    return cb(null, true);
  };
}

export const uploadAvatar = multer({
  storage: storageFor('avatars'),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: filterFor(IMAGE_TYPES),
}).single('avatar');

export const uploadCertificate = multer({
  storage: storageFor('certificates'),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: filterFor(DOCUMENT_TYPES),
}).single('file');

/** Public URL for a stored upload, relative to the API origin. */
export function publicUrlFor(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

/** Best-effort removal of a previously stored upload. */
export function removeUpload(publicUrl) {
  if (!publicUrl?.startsWith('/uploads/')) return;
  const target = path.join(config.uploadsDir, publicUrl.replace('/uploads/', ''));
  // Guard against traversal via a crafted stored value.
  if (!target.startsWith(config.uploadsDir)) return;
  fs.rm(target, { force: true }, () => {});
}
