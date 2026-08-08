import mongoose from 'mongoose';

/**
 * An offer made to a student.
 *
 * Kept separate from the drive shortlist because an offer outlives the drive
 * that produced it: it has its own lifecycle (accepted, declined, joined),
 * and placement reports are counted from offers rather than from shortlist
 * stages.
 */
const offerSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },

    company: { type: String, required: true, trim: true, index: true },
    role: { type: String, required: true, trim: true },

    /** Stored in rupees per annum so reports can aggregate without parsing. */
    ctc: { type: Number, default: null, min: 0 },
    location: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['offered', 'accepted', 'declined', 'joined', 'withdrawn'],
      default: 'offered',
      index: true,
    },

    offeredAt: { type: Date, default: Date.now },
    joiningDate: { type: Date },
    notes: { type: String, default: '', maxlength: 2000 },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// A student can hold several offers; reports count placed students distinctly.
offerSchema.index({ student: 1, status: 1 });
offerSchema.index({ company: 1, offeredAt: -1 });

export const Offer = mongoose.model('Offer', offerSchema);
