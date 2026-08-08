import mongoose from 'mongoose';

/**
 * A per-student interview slot within an event.
 *
 * Times are stored on the slot rather than derived from the event so a
 * rescheduled candidate does not force the whole day to be regenerated.
 */
const slotSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    /** 1-indexed because it is shown to people, not used as an array index. */
    panel: { type: Number, default: 1, min: 1 },
    venue: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'attended', 'no-show', 'cancelled'],
      default: 'scheduled',
    },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { _id: true },
);

/**
 * Anything on the placement calendar: a drive, a test, an interview day, a
 * pre-placement talk, a training session or a deadline.
 *
 * One model rather than one per kind, because the calendar has to show them
 * side by side and a student does not care which table a clash came from.
 */
const placementEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: ['drive', 'test', 'interview', 'pre-placement-talk', 'training', 'deadline'],
      default: 'drive',
      index: true,
    },

    company: { type: String, trim: true, default: '', index: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },

    startsAt: { type: Date, required: true, index: true },
    endsAt: {
      type: Date,
      required: true,
      // A path validator rather than a pre-validate hook: hooks are skipped
      // by validateSync(), so the guard would silently not exist anywhere
      // except save(). A negative-length event breaks every range query.
      validate: {
        validator: function endsAfterStart(value) {
          return !this.startsAt || !value || value >= this.startsAt;
        },
        message: 'An event cannot end before it starts.',
      },
    },
    venue: { type: String, trim: true, default: '' },
    description: { type: String, default: '', maxlength: 4000 },

    /**
     * Who sees it. `college` reaches every student; the others reach only
     * students holding a slot, so an event with no slots reaches nobody by
     * design rather than by accident.
     */
    audience: {
      type: String,
      enum: ['college', 'shortlist', 'selected'],
      default: 'shortlist',
    },

    slots: { type: [slotSchema], default: [] },

    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// The calendar is always read as a date range, usually filtered by status.
placementEventSchema.index({ startsAt: 1, status: 1 });
// A student's own agenda is looked up by their slot.
placementEventSchema.index({ 'slots.student': 1, startsAt: 1 });

placementEventSchema.virtual('slotCount').get(function slotCount() {
  return this.slots.length;
});

placementEventSchema.virtual('attendedCount').get(function attendedCount() {
  return this.slots.filter((slot) => slot.status === 'attended').length;
});

placementEventSchema.set('toJSON', { virtuals: true });
placementEventSchema.set('toObject', { virtuals: true });

export const PlacementEvent = mongoose.model('PlacementEvent', placementEventSchema);
