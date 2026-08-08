import mongoose from 'mongoose';

/**
 * A daily record of a student's readiness.
 *
 * Growth over time cannot be reconstructed after the fact — the inputs
 * (skills, solved counts, ATS score) only ever show their current value. So
 * the history has to be written as it happens, starting from the day this
 * exists.
 */
const readinessSnapshotSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    /** Midnight UTC for the day, so one row per student per day. */
    day: { type: Date, required: true },

    score: { type: Number, required: true, min: 0, max: 100 },
    components: {
      skills: { type: Number, default: 0 },
      coding: { type: Number, default: 0 },
      resume: { type: Number, default: 0 },
      interview: { type: Number, default: 0 },
      projects: { type: Number, default: 0 },
    },

    /** Raw counters, so a chart can show "problems solved" as well as scores. */
    totals: {
      solved: { type: Number, default: 0 },
      verifiedSkills: { type: Number, default: 0 },
      interviews: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

// One row per student per day; re-recording the same day overwrites it.
readinessSnapshotSchema.index({ user: 1, day: 1 }, { unique: true });

export const ReadinessSnapshot = mongoose.model('ReadinessSnapshot', readinessSnapshotSchema);
