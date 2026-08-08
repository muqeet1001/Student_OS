import mongoose from 'mongoose';

import { withVirtuals } from './plugins.js';

/**
 * An opportunity a student can see and apply to.
 *
 * `requirements` is the parsed form of `description`, computed once on save
 * rather than on every match. Matching a whole cohort against a job on each
 * request would otherwise re-parse the same text hundreds of times.
 */
const jobPostingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160, index: true },
    company: { type: String, required: true, trim: true, index: true },
    companySlug: { type: String, trim: true, lowercase: true },

    type: {
      type: String,
      enum: ['full-time', 'internship', 'campus', 'apprenticeship', 'hackathon'],
      default: 'full-time',
      index: true,
    },
    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site'],
      default: 'on-site',
      index: true,
    },
    location: { type: String, trim: true, default: '' },

    /** Free text: ranges, "as per company norms" and stipends all appear. */
    compensation: { type: String, trim: true, default: '' },

    description: { type: String, required: true, maxlength: 20_000 },
    aboutCompany: { type: String, default: '', maxlength: 4000 },
    applyUrl: { type: String, default: '', trim: true },

    /** Snapshot of the parsed job description — see the note above. */
    requirements: {
      skills: { type: [{ name: String, required: Boolean, _id: false }], default: [] },
      minCgpa: { type: Number, default: null },
      graduationYear: { type: Number, default: null },
      branches: { type: [String], default: [] },
      minExperienceYears: { type: Number, default: null },
    },

    deadline: { type: Date, index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// The student list is "open jobs, soonest deadline first".
jobPostingSchema.index({ active: 1, deadline: 1 });

jobPostingSchema.virtual('isOpen').get(function isOpen() {
  return this.active && (!this.deadline || this.deadline.getTime() > Date.now());
});

withVirtuals(jobPostingSchema);

export const JobPosting = mongoose.model('JobPosting', jobPostingSchema);

/**
 * A student's relationship with a job: saved, applied, and where they are in
 * the pipeline. Doubles as the placement tracker's data source.
 */
const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true },

    stage: {
      type: String,
      enum: ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected'],
      default: 'saved',
      index: true,
    },

    /** Match at the moment of applying, so later profile edits do not rewrite history. */
    matchAtApply: { type: Number, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    appliedAt: { type: Date },
  },
  { timestamps: true },
);

// One row per student per job — saving then applying updates the same record.
applicationSchema.index({ user: 1, job: 1 }, { unique: true });
applicationSchema.index({ user: 1, stage: 1 });

export const Application = mongoose.model('Application', applicationSchema);
