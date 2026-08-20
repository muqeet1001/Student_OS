import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';

/**
 * File storage in MongoDB, via GridFS.
 *
 * The uploads folder was always the wrong home for anything that matters.
 * On every platform this is likely to be deployed to — Render, Railway, Fly,
 * a container on a school server that gets rebuilt — the filesystem is
 * ephemeral, so a student's offer letter survives exactly until the next
 * deploy. Object storage would fix that, and so does this, without adding a
 * second service to run, a second set of credentials to leak, or a bill.
 *
 * GridFS is not the right answer at video scale. For a few thousand PDFs of
 * a few hundred kilobytes each it is exactly right: one backup covers the
 * data and the files together, and they can never disagree about what
 * exists.
 */

const BUCKET = 'documents';

/** Lazily built, because the connection does not exist at import time. */
function bucket() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('No database connection for file storage.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
}

/**
 * Filenames arrive from the client and end up in a Content-Disposition
 * header, so they are stripped to something that cannot carry a path, a
 * quote or a newline. A newline in particular would let a crafted filename
 * inject a header.
 */
export function safeFilename(name) {
  const base = String(name ?? '')
    .replace(/[\r\n]/g, '')
    .split(/[\\/]/)
    .pop()
    .trim();

  // eslint-disable-next-line no-control-regex -- header controls are exactly what must be removed
  const cleaned = base.replace(/["\u0000-\u001f]/g, '').slice(0, 120);
  return cleaned || 'document';
}

/**
 * Stores a buffer and returns the GridFS id.
 *
 * The checksum lets an identical re-upload be recognised, and gives a cheap
 * integrity check that the bytes read back are the bytes written.
 */
export async function storeFile({ buffer, filename, contentType, metadata = {} }) {
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  const stream = bucket().openUploadStream(safeFilename(filename), {
    contentType,
    metadata: { ...metadata, checksum, size: buffer.length },
  });

  await new Promise((resolve, reject) => {
    Readable.from(buffer).pipe(stream).on('finish', resolve).on('error', reject);
  });

  return { fileId: stream.id, checksum, size: buffer.length };
}

/** Opens a read stream. The caller sets headers and pipes it to the response. */
export function openDownloadStream(fileId) {
  return bucket().openDownloadStream(new mongoose.Types.ObjectId(String(fileId)));
}

/**
 * Deletes a stored file.
 *
 * Non-throwing: a document row whose bytes have already gone should still be
 * removable, or the row becomes impossible to delete.
 */
export async function deleteFile(fileId) {
  try {
    await bucket().delete(new mongoose.Types.ObjectId(String(fileId)));
    return true;
  } catch {
    return false;
  }
}

export async function fileExists(fileId) {
  try {
    const found = await bucket()
      .find({ _id: new mongoose.Types.ObjectId(String(fileId)) })
      .limit(1)
      .toArray();
    return found.length > 0;
  } catch {
    return false;
  }
}

export async function getFileInfo(fileId) {
  try {
    const files = await bucket()
      .find({ _id: new mongoose.Types.ObjectId(String(fileId)) })
      .limit(1)
      .toArray();
    return files[0] || null;
  } catch {
    return null;
  }
}
