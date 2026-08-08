import mongoose from 'mongoose';

/** The readiness components a session can claim to move. */
export const TARGET_COMPONENTS = ['skills', 'coding', 'resume', 'interview', 'projects'];

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['registered', 'attended', 'absent'],
      default: 'registered',
    },
    markedAt: { type: Date },
  },
  { _id: true },
);

/**
 * A training session the college ran.
 *
 * `targetComponent` is not decoration: effectiveness is checked against the
 * thing the session claimed it would move, so a DSA bootcamp that lifts
 * overall readiness while leaving the coding component flat can be caught
 * taking credit for a gain that came from somewhere else.
 */
const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 4000 },

    type: {
      type: String,
      enum: ['workshop', 'bootcamp', 'seminar', 'mock-drive', 'one-on-one'],
      default: 'workshop',
      index: true,
    },

    targetComponent: { type: String, enum: [...TARGET_COMPONENTS, null], default: null },
    targetSkills: { type: [String], default: [] },

    trainer: { type: String, default: '', trim: true, maxlength: 160 },
    provider: { type: String, enum: ['internal', 'external'], default: 'internal' },
    /** Total spend in rupees, so cost per readiness point can be computed. */
    cost: { type: Number, default: null, min: 0 },

    startsAt: { type: Date, required: true, index: true },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator: function endsAfterStart(value) {
          return !this.startsAt || !value || value >= this.startsAt;
        },
        message: 'A session cannot end before it starts.',
      },
    },
    venue: { type: String, default: '', trim: true, maxlength: 160 },

    attendance: { type: [attendanceSchema], default: [] },

    status: {
      type: String,
      enum: ['planned', 'running', 'completed', 'cancelled'],
      default: 'planned',
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

trainingSchema.index({ startsAt: -1, status: 1 });
trainingSchema.index({ 'attendance.student': 1 });

trainingSchema.virtual('attendedCount').get(function attendedCount() {
  return this.attendance.filter((entry) => entry.status === 'attended').length;
});

trainingSchema.set('toJSON', { virtuals: true });
trainingSchema.set('toObject', { virtuals: true });

export const Training = mongoose.model('Training', trainingSchema);
