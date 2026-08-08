import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  { text: { type: String, required: true, maxlength: 400 }, isCorrect: { type: Boolean, default: false } },
  { _id: true },
);

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, maxlength: 1200 },
    options: {
      type: [optionSchema],
      validate: {
        validator: (options) =>
          options.length >= 2 && options.filter((option) => option.isCorrect).length === 1,
        message: 'A question needs at least two options and exactly one correct answer',
      },
    },
    explanation: { type: String, default: '' },
    /** Which level this question is pitched at, used to grade rather than just score. */
    tier: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  },
  { _id: true },
);

/**
 * A short assessment that turns a self-declared skill into a verified one.
 *
 * Skills are keyed by canonical name so an assessment written for "React"
 * also serves a student who typed "React.js" — matching goes through the
 * same taxonomy the job matcher uses.
 */
const skillAssessmentSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true, unique: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['programming', 'frontend', 'backend', 'database', 'cloud', 'soft', 'other'],
      default: 'other',
    },
    description: { type: String, default: '', maxlength: 500 },
    durationMinutes: { type: Number, default: 10, min: 1, max: 90 },
    questions: { type: [questionSchema], default: [] },

    /**
     * Minimum percentage for each level. Below the intermediate threshold the
     * skill is verified at beginner rather than failed — the point is an
     * honest level, not a pass mark.
     */
    thresholds: {
      intermediate: { type: Number, default: 50 },
      advanced: { type: Number, default: 80 },
    },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const SkillAssessment = mongoose.model('SkillAssessment', skillAssessmentSchema);

const skillAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillAssessment', required: true },
    skill: { type: String, required: true, index: true },

    answers: {
      type: [
        {
          question: mongoose.Schema.Types.ObjectId,
          selectedOption: { type: mongoose.Schema.Types.ObjectId, default: null },
          isCorrect: { type: Boolean, default: false },
          _id: false,
        },
      ],
      default: [],
    },

    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },

    status: { type: String, enum: ['in-progress', 'submitted', 'expired'], default: 'in-progress', index: true },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },
  },
  { timestamps: true },
);

// Powers the skill history chart and the cooldown check.
skillAttemptSchema.index({ user: 1, skill: 1, submittedAt: -1 });
skillAttemptSchema.index({ user: 1, status: 1 });

export const SkillAttempt = mongoose.model('SkillAttempt', skillAttemptSchema);
