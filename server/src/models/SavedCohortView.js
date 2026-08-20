import mongoose from 'mongoose';

const savedCohortViewSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: ['filter', 'candidate-list'], default: 'filter', index: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    students: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true },
);

savedCohortViewSchema.index({ owner: 1, name: 1 }, { unique: true });

export const SavedCohortView = mongoose.model('SavedCohortView', savedCohortViewSchema);
