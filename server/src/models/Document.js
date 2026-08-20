import mongoose from 'mongoose';

/**
 * The kinds a placement office actually chases students for.
 *
 * A closed list rather than free text, because the whole point of the vault
 * is being able to answer "who has not submitted an ID proof yet" without
 * reading every row.
 */
export const DOCUMENT_KINDS = [
  { key: 'id-proof', label: 'ID proof', required: true },
  { key: 'marksheet', label: 'Marksheet', required: true },
  { key: 'resume', label: 'Resume', required: true },
  { key: 'offer-letter', label: 'Offer letter', required: false },
  { key: 'certificate', label: 'Certificate', required: false },
  { key: 'other', label: 'Other', required: false },
];

const KIND_KEYS = DOCUMENT_KINDS.map((kind) => kind.key);

/**
 * A file belonging to a student.
 *
 * The bytes live in GridFS; this is the row that says whose they are, what
 * they are, and whether anyone has checked them. Kept separate so listing a
 * student's documents never has to touch the file contents.
 */
const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    kind: { type: String, enum: KIND_KEYS, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },

    /** GridFS file id. The bytes are never inlined into this document. */
    file: { type: mongoose.Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true, maxlength: 160 },
    contentType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    checksum: { type: String, required: true, maxlength: 64 },
    /** Optional validity date for IDs, certificates and other expiring evidence. */
    expiresAt: { type: Date, default: null, index: true },

    /*
     * Verification is a staff action, so it records who and when. A boolean
     * alone would leave "verified by nobody, at no time" indistinguishable
     * from a real check.
     */
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true },
);

documentSchema.index({ owner: 1, kind: 1 });
documentSchema.index({ status: 1, createdAt: -1 });

export const StudentDocument = mongoose.model('StudentDocument', documentSchema);
