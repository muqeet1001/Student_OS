import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    answer: { type: String, default: '' },

    company: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true, min: 1990, max: 2100, index: true },
    role: { type: String, default: '', trim: true },

    round: {
      type: String,
      enum: ['online-assessment', 'technical', 'system-design', 'hr', 'group-discussion', 'other'],
      default: 'technical',
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    topics: { type: [String], default: [], index: true },

    // Optional link to a practice problem, so "Solve now" can open the editor.
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', default: null },

    source: { type: String, default: '' },
    isPublished: { type: Boolean, default: true, index: true },

    stats: {
      views: { type: Number, default: 0 },
      solves: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

questionSchema.index({ title: 'text', body: 'text', topics: 'text', company: 'text' });
// The library's default view: newest questions for a company.
questionSchema.index({ company: 1, year: -1 });

export const Question = mongoose.model('Question', questionSchema);

const questionProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    status: { type: String, enum: ['solved', 'revisit'], default: 'solved' },
    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true },
);

questionProgressSchema.index({ user: 1, question: 1 }, { unique: true });

export const QuestionProgress = mongoose.model('QuestionProgress', questionProgressSchema);
