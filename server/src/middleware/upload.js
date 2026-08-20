import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const TYPES = {
  'image/png': {
    extension: '.png',
    matches: (buffer) =>
      buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
  },
  'image/jpeg': {
    extension: '.jpg',
    matches: (buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/gif': {
    extension: '.gif',
    matches: (buffer) =>
      ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  },
  'image/webp': {
    extension: '.webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'application/pdf': {
    extension: '.pdf',
    matches: (buffer) =>
      buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  },
};

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);

/** Detects supported formats from bytes instead of trusting multipart headers. */
export function detectUploadType(buffer, allowed = DOCUMENT_TYPES) {
  for (const [mime, definition] of Object.entries(TYPES)) {
    if (allowed.has(mime) && definition.matches(buffer)) {
      return { mime, extension: definition.extension };
    }
  }
  return null;
}

/** Replaces a user-controlled extension with the one proved by the bytes. */
export function canonicalUploadName(originalname, extension) {
  const supplied = String(originalname || 'upload');
  const base = path
    .basename(supplied, path.extname(supplied))
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .trim()
    .slice(0, 100) || 'upload';
  return `${base}${extension}`;
}

function secureUpload({ allowed, fileSize, fieldName }) {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize, files: 1 },
  }).single(fieldName);

  return (req, res, next) => {
    parse(req, res, (error) => {
      if (error) return next(error);
      if (!req.file) return next();

      const detected = detectUploadType(req.file.buffer, allowed);
      if (!detected) {
        return next(
          ApiError.badRequest('The uploaded file contents are not a supported format'),
        );
      }

      req.file.detectedMime = detected.mime;
      req.file.safeName = canonicalUploadName(req.file.originalname, detected.extension);
      return next();
    });
  };
}

export const uploadAvatar = secureUpload({
  allowed: IMAGE_TYPES,
  fileSize: 2 * 1024 * 1024,
  fieldName: 'avatar',
});

export const uploadCertificate = secureUpload({
  allowed: DOCUMENT_TYPES,
  fileSize: 5 * 1024 * 1024,
  fieldName: 'file',
});

export const uploadDocumentFile = secureUpload({
  allowed: DOCUMENT_TYPES,
  fileSize: 10 * 1024 * 1024,
  fieldName: 'file',
});
