import mongoose from 'mongoose';

import { withVirtuals } from './plugins.js';

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true },
    answer: { type: String, default: '' },
    skipped: { type: Boolean, default: false },
    score: { type: Number, default: 0, min: 0, max: 100 },
    dimensions: {
      structure: { type: Number, default: 0 },
      specificity: { type: Number, default: 0 },
      coverage: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 },
    },
    feedback: {
      type: [{ text: String, positive: Boolean, _id: false }],
      default: [],
    },
    secondsTaken: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    round: {
      type: String,
      required: true,
      enum: ['behavioural', 'technical', 'system-design', 'hr'],
    },
    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
    targetRole: { type: String, trim: true },
    /** Optional JD used to prioritise questions whose expected concepts overlap the role. */
    jobDescription: { type: String, trim: true, default: '', maxlength: 5000 },

    /**
     * The question set is fixed when the session starts, so a refresh or a
     * resumed session always asks the same questions in the same order.
     */
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion' }],
    answers: { type: [answerSchema], default: [] },

    status: {
      type: String,
      enum: ['in-progress', 'completed', 'abandoned'],
      default: 'in-progress',
      index: true,
    },

    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    dimensions: {
      structure: { type: Number, default: 0 },
      specificity: { type: Number, default: 0 },
      coverage: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 },
    },
    verdict: { type: String, default: '' },
    summary: { type: [String], default: [] },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Finding a user's one open session, and listing finished ones by recency.
interviewSessionSchema.index({ user: 1, status: 1 });
interviewSessionSchema.index({ user: 1, completedAt: -1 });

interviewSessionSchema.virtual('questionCount').get(function questionCount() {
  return this.questions.length;
});

withVirtuals(interviewSessionSchema);

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
