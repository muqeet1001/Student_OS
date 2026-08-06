import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true, index: true },

    language: { type: String, enum: ['javascript'], default: 'javascript' },
    code: { type: String, required: true, maxlength: 60_000 },

    verdict: {
      type: String,
      enum: [
        'accepted',
        'wrong_answer',
        'runtime_error',
        'compile_error',
        'timeout',
        'memory_exceeded',
        'internal_error',
      ],
      required: true,
      index: true,
    },
    message: { type: String, default: '' },

    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    runtimeMs: { type: Number, default: 0 },
    memoryBytes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Powers "my submissions for this problem", newest first.
submissionSchema.index({ user: 1, problem: 1, createdAt: -1 });
// Powers streaks and the activity heatmap.
submissionSchema.index({ user: 1, createdAt: -1 });

export const Submission = mongoose.model('Submission', submissionSchema);

const solvedProblemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    solvedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One row per user/problem — the first acceptance is what counts.
solvedProblemSchema.index({ user: 1, problem: 1 }, { unique: true });

export const SolvedProblem = mongoose.model('SolvedProblem', solvedProblemSchema);

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Bookmarks cover both practice problems and PYQ entries.
    targetType: { type: String, enum: ['problem', 'question'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    targetModel: { type: String, enum: ['Problem', 'Question'], required: true },
  },
  { timestamps: true },
);

bookmarkSchema.index({ user: 1, target: 1 }, { unique: true });

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
