import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 500 },
    // Correctness is `select: false` at the parent level so it never ships
    // to the client while an attempt is in progress.
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true },
);

const testQuestionSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    prompt: { type: String, required: true, maxlength: 2000 },
    options: {
      type: [optionSchema],
      validate: {
        validator: (options) => options.length >= 2 && options.some((o) => o.isCorrect),
        message: 'A question needs at least two options and one correct answer',
      },
    },
    explanation: { type: String, default: '' },
    topic: { type: String, default: '', index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    marks: { type: Number, default: 1, min: 1, max: 10 },
  },
  { timestamps: true },
);

export const TestQuestion = mongoose.model('TestQuestion', testQuestionSchema);

const testSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 600 },
    category: {
      type: String,
      enum: ['aptitude', 'technical', 'communication'],
      required: true,
      index: true,
    },
    // Skills a passing score verifies on the student's profile.
    verifies: { type: [String], default: [] },

    durationMinutes: { type: Number, required: true, min: 1, max: 300 },
    questionCount: { type: Number, required: true, min: 1, max: 200 },
    passPercentage: { type: Number, default: 60, min: 0, max: 100 },

    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Test = mongoose.model('Test', testSchema);

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'TestQuestion', required: true },
    selectedOption: { type: mongoose.Schema.Types.ObjectId, default: null },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false },
);

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },

    // The question order is fixed at start time so a refresh cannot reshuffle
    // into an easier set.
    questions: { type: [mongoose.Schema.Types.ObjectId], ref: 'TestQuestion', default: [] },
    answers: { type: [answerSchema], default: [] },

    status: { type: String, enum: ['in-progress', 'submitted', 'expired'], default: 'in-progress' },

    startedAt: { type: Date, default: Date.now },
    // Authoritative deadline, computed server-side from the test duration.
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },

    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

attemptSchema.index({ user: 1, test: 1, createdAt: -1 });
attemptSchema.index({ user: 1, status: 1 });

export const TestAttempt = mongoose.model('TestAttempt', attemptSchema);
