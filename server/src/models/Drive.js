import mongoose from 'mongoose';

import { withVirtuals } from './plugins.js';

/**
 * A company visit: the requirement, the eligible pool and who was shortlisted.
 *
 * Separate from JobPosting because a drive is the college's process around a
 * role — eligibility, shortlisting, selection — while a posting is what a
 * student sees and applies to. One company visit can carry several roles.
 */
const shortlistEntrySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Match at shortlist time, so later profile edits do not rewrite the decision. */
    matchAtShortlist: { type: Number, default: null },
    stage: {
      type: String,
      enum: ['shortlisted', 'assessment', 'interview', 'selected', 'rejected'],
      default: 'shortlisted',
    },
    notes: { type: String, default: '', maxlength: 1000 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const driveSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, index: true },
    role: { type: String, required: true, trim: true },
    description: { type: String, required: true, maxlength: 20_000 },

    /** Parsed once from the description; see JobPosting for the same reasoning. */
    requirements: {
      skills: { type: [{ name: String, required: Boolean, _id: false }], default: [] },
      minCgpa: { type: Number, default: null },
      graduationYear: { type: Number, default: null },
      branches: { type: [String], default: [] },
      minExperienceYears: { type: Number, default: null },
    },

    /** Additional bars the college sets beyond what the JD says. */
    minReadiness: { type: Number, default: 0, min: 0, max: 100 },

    package: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    driveDate: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'open', 'in-progress', 'closed'],
      default: 'planned',
      index: true,
    },

    shortlist: { type: [shortlistEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

driveSchema.index({ status: 1, driveDate: -1 });

driveSchema.virtual('shortlistCount').get(function shortlistCount() {
  return this.shortlist.length;
});

driveSchema.virtual('selectedCount').get(function selectedCount() {
  return this.shortlist.filter((entry) => entry.stage === 'selected').length;
});

withVirtuals(driveSchema);

export const Drive = mongoose.model('Drive', driveSchema);
