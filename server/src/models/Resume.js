import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },

    /** Tailoring notes: which role this version was cut for. */
    targetRole: { type: String, trim: true, maxlength: 120, default: '' },
    targetCompany: { type: String, trim: true, maxlength: 120, default: '' },

    template: { type: String, enum: ['editorial', 'compact'], default: 'editorial' },
    accent: {
      type: String,
      default: '#a83206',
      // Guards the value that gets interpolated straight into inline styles.
      match: [/^#[0-9a-f]{6}$/i, 'Accent must be a hex colour'],
    },

    /** Sections the student chose to include in this version. */
    sections: {
      summary: { type: Boolean, default: true },
      experience: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      education: { type: Boolean, default: true },
      skills: { type: Boolean, default: true },
      certifications: { type: Boolean, default: true },
    },

    /**
     * The profile as it stood when this version was saved. A resume sent to
     * an employer must not silently change when the profile is edited later,
     * so the content is frozen rather than referenced.
     */
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },

    atsScore: { type: Number, default: 0, min: 0, max: 100 },
    atsChecks: {
      type: [{ label: String, passed: Boolean, weight: Number, fix: String, _id: false }],
      default: [],
    },
  },
  { timestamps: true },
);

resumeSchema.index({ user: 1, updatedAt: -1 });

export const Resume = mongoose.model('Resume', resumeSchema);
