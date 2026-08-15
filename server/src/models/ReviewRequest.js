import mongoose from 'mongoose';

const reviewRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['profile', 'resume', 'interview', 'project'], required: true },
  resourceId: { type: String, default: '', maxlength: 100 },
  note: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['requested', 'reviewed'], default: 'requested', index: true },
  feedback: { type: String, default: '', maxlength: 4000 },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

reviewRequestSchema.index(
  { student: 1, kind: 1, resourceId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'requested' } },
);

export const ReviewRequest = mongoose.model('ReviewRequest', reviewRequestSchema);
