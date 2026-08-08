import mongoose from 'mongoose';

import { withVirtuals } from './plugins.js';

const testCaseSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    // Arguments the solution is called with, and the value it must return.
    input: { type: mongoose.Schema.Types.Mixed, required: true },
    expectedOutput: { type: mongoose.Schema.Types.Mixed },
    // Hidden cases still run, but their data is never sent to the client.
    hidden: { type: Boolean, default: false },
  },
  { _id: true },
);

const problemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      index: true,
    },
    statement: { type: String, required: true },
    constraints: { type: [String], default: [] },
    hints: { type: [String], default: [] },
    followUp: { type: String, default: '' },

    examples: {
      type: [
        {
          _id: false,
          input: String,
          output: String,
          explanation: { type: String, default: '' },
        },
      ],
      default: [],
    },

    topics: { type: [String], default: [], index: true },
    companies: { type: [String], default: [], index: true },

    // The function the submission must define, and the signature shown to users.
    functionName: { type: String, required: true, trim: true },
    starterCode: { type: String, default: '' },
    referenceSolution: { type: String, default: '', select: false },

    testCases: { type: [testCaseSchema], default: [], select: false },

    timeoutMs: { type: Number, default: 4000, min: 500, max: 15_000 },
    isPublished: { type: Boolean, default: true, index: true },

    stats: {
      submissions: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

problemSchema.index({ title: 'text', statement: 'text', topics: 'text' });

problemSchema.virtual('acceptanceRate').get(function acceptanceRate() {
  if (!this.stats?.submissions) return 0;
  return Math.round((this.stats.accepted / this.stats.submissions) * 100);
});

withVirtuals(problemSchema);

export const Problem = mongoose.model('Problem', problemSchema);
