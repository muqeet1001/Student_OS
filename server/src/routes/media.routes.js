import { Router } from 'express';
import mongoose from 'mongoose';
import { getFileInfo, openDownloadStream } from '../services/fileStore.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const mediaRoutes = Router();

mediaRoutes.get(
  '/:fileId',
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw ApiError.notFound('Media not found');
    }

    const file = await getFileInfo(fileId);
    if (!file) {
      throw ApiError.notFound('Media not found');
    }

    const etag = file.metadata?.checksum ? `"${file.metadata.checksum}"` : `"${file._id}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', file.length);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = openDownloadStream(fileId);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).end();
    });

    stream.pipe(res);
  }),
);
