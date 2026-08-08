import mongoose from 'mongoose';

import { withVirtuals } from './plugins.js';

/**
 * One student's copy of an announcement.
 *
 * Recipients are frozen at send time rather than re-resolved on read. The
 * cohort changes — students graduate, branches get corrected, a drive
 * shortlist is edited — and "who did this actually reach" has to stay
 * answerable months later. Re-running the filter would quietly rewrite
 * history every time someone edited a profile.
 */
const recipientSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    /** `skipped` means email was never attempted, and says why. */
    delivery: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'skipped',
    },
    error: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { _id: false },
);

const announcementSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20_000 },

    audience: {
      type: {
        type: String,
        enum: ['all', 'branch', 'year', 'band', 'drive', 'selected'],
        required: true,
      },
      branch: { type: String, default: '' },
      graduationYear: { type: Number, default: null },
      band: { type: String, default: '' },
      drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },
      students: { type: [mongoose.Schema.Types.ObjectId], default: [] },
      /** Human description, frozen alongside the recipients. */
      description: { type: String, default: '' },
    },

    recipients: { type: [recipientSchema], default: [] },

    /*
     * Whether email was even possible when this was sent. Recorded on the
     * announcement so a reader months later can tell "nobody was emailed
     * because SMTP was off" from "everybody was emailed and it worked".
     */
    emailAvailable: { type: Boolean, default: false },
    emailNote: { type: String, default: '' },

    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

// A student's inbox is looked up by their recipient row.
announcementSchema.index({ 'recipients.student': 1, sentAt: -1 });

announcementSchema.virtual('delivery').get(function delivery() {
  const count = (status) => this.recipients.filter((row) => row.delivery === status).length;

  return {
    total: this.recipients.length,
    sent: count('sent'),
    failed: count('failed'),
    skipped: count('skipped'),
    read: this.recipients.filter((row) => row.readAt).length,
  };
});

withVirtuals(announcementSchema);

export const Announcement = mongoose.model('Announcement', announcementSchema);
