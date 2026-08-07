import mongoose from 'mongoose';

const interviewQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    round: {
      type: String,
      required: true,
      enum: ['behavioural', 'technical', 'system-design', 'hr'],
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
      index: true,
    },
    /** Points a strong answer is expected to touch; drives the relevance score. */
    keywords: { type: [String], default: [] },
    /** Shown before answering — what to cover, never the answer itself. */
    hint: { type: String, trim: true },
    /** Revealed only in the report, after the student has committed an answer. */
    modelAnswer: { type: String, trim: true },
    /** Optional narrowing, e.g. only ask this for backend roles. */
    roles: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

interviewQuestionSchema.index({ round: 1, difficulty: 1, active: 1 });

export const InterviewQuestion = mongoose.model('InterviewQuestion', interviewQuestionSchema);
