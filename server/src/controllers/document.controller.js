import { StudentDocument, DOCUMENT_KINDS } from '../models/Document.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deleteFile, openDownloadStream, safeFilename, storeFile } from '../services/fileStore.js';
import { validated } from '../middleware/validate.js';

/** What a student is expected to have on file. */
const REQUIRED_KINDS = DOCUMENT_KINDS.filter((kind) => kind.required);

/** Staff see anyone's; a student sees only their own. */
function scopeFor(req) {
  const query = validated(req, 'query');
  if (req.user.role === 'admin' && query.student) return { owner: query.student };
  if (req.user.role === 'admin' && query.all === 'true') return {};
  return { owner: req.user._id };
}

export const listDocuments = asyncHandler(async (req, res) => {
  const query = validated(req, 'query');
  const scope = scopeFor(req);
  const filter = { ...scope };
  if (query.kind) filter.kind = query.kind;
  if (query.status) filter.status = query.status;

  const [documents, total, pending, heldKinds] = await Promise.all([
    StudentDocument.find(filter)
      .populate('owner', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    StudentDocument.countDocuments(filter),
    StudentDocument.countDocuments({ ...filter, status: 'pending' }),
    StudentDocument.distinct('kind', scope),
  ]);

  // Only meaningful for one student's own vault, so it is computed there and
  // left off a cohort-wide listing where it would be nonsense.
  const single = Boolean(filter.owner);
  const held = new Set(heldKinds);

  res.json({
    success: true,
    data: {
      documents,
      kinds: DOCUMENT_KINDS,
      missing: single ? REQUIRED_KINDS.filter((kind) => !held.has(kind.key)) : [],
      totals: {
        documents: total,
        pending,
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit) || 1,
      },
    },
  });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file was uploaded.');

  const { kind, title } = req.body;

  /*
   * A student uploads for themselves. Staff may upload on a student's
   * behalf — an offer letter usually arrives at the placement office rather
   * than the student — but only by naming the owner explicitly, so a
   * mis-scoped request can never silently file a document under the wrong
   * person.
   */
  let owner = req.user._id;
  if (req.body.owner && String(req.body.owner) !== String(req.user._id)) {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'You can only upload documents to your own vault.');
    }

    const student = await User.findOne({ _id: req.body.owner, role: 'student' }).select('_id').lean();
    if (!student) throw new ApiError(404, 'Student not found.');
    owner = student._id;
  }

  const stored = await storeFile({
    buffer: req.file.buffer,
    filename: req.file.safeName,
    contentType: req.file.detectedMime,
    metadata: { owner: String(owner), kind },
  });

  let document;
  try {
    document = await StudentDocument.create({
      owner,
      kind,
      title: title || req.file.safeName,
      file: stored.fileId,
      filename: req.file.safeName,
      contentType: req.file.detectedMime,
      size: stored.size,
      checksum: stored.checksum,
    });
  } catch (error) {
    await deleteFile(stored.fileId);
    throw error;
  }

  res.status(201).json({ success: true, data: { document } });
});

/** Streams the bytes back, without ever loading the whole file into memory. */
export const downloadDocument = asyncHandler(async (req, res) => {
  const document = await StudentDocument.findById(req.params.documentId).lean();
  if (!document) throw new ApiError(404, 'Document not found.');

  const isOwner = String(document.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    // 404 rather than 403: confirming that someone else's document exists is
    // itself a leak, however small.
    throw new ApiError(404, 'Document not found.');
  }

  res.setHeader('Content-Type', document.contentType);
  res.setHeader('Content-Length', document.size);
  // `attachment` so a PDF or an SVG can never execute in the page's origin.
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename(document.filename)}"`,
  );

  const stream = openDownloadStream(document.file);

  stream.on('error', () => {
    // Headers may already be sent by the time GridFS fails, so the only
    // honest thing left is to break the connection rather than append an
    // error body to a half-written file.
    if (res.headersSent) return res.destroy();
    return res.status(404).json({ success: false, message: 'The stored file is missing.' });
  });

  stream.pipe(res);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await StudentDocument.findById(req.params.documentId);
  if (!document) throw new ApiError(404, 'Document not found.');

  const isOwner = String(document.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(404, 'Document not found.');

  // A verified document is a record the office relies on, so a student
  // cannot quietly withdraw it after it has been accepted.
  if (document.status === 'verified' && req.user.role !== 'admin') {
    throw new ApiError(403, 'A verified document can only be removed by the placement office.');
  }

  await document.deleteOne();
  await deleteFile(document.file);

  res.json({ success: true, data: { message: 'Document deleted.' } });
});

/** Staff marking a document checked. */
export const reviewDocument = asyncHandler(async (req, res) => {
  const document = await StudentDocument.findById(req.params.documentId);
  if (!document) throw new ApiError(404, 'Document not found.');

  document.status = req.body.status;
  document.reviewNote = req.body.reviewNote ?? '';
  document.reviewedBy = req.user._id;
  document.reviewedAt = new Date();

  await document.save();
  await document.populate('owner', 'name email');

  res.json({ success: true, data: { document } });
});
