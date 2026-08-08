import mongoose from 'mongoose';

/**
 * The fixed vocabulary recruiters grade a cohort against.
 *
 * Deliberately a closed list rather than free text. Free-text feedback cannot
 * be counted, and a theme nobody can count is a theme nobody can fund — the
 * whole point of collecting this is to be able to say "six recruiters named
 * communication" to a budget holder. Free text still has a home in `notes`.
 */
export const FEEDBACK_TAGS = [
  { key: 'dsa', label: 'Data structures & algorithms' },
  { key: 'core-cs', label: 'Core CS fundamentals' },
  { key: 'programming', label: 'Programming fluency' },
  { key: 'system-design', label: 'System design' },
  { key: 'projects', label: 'Project depth' },
  { key: 'communication', label: 'Communication' },
  { key: 'aptitude', label: 'Aptitude & reasoning' },
  { key: 'domain', label: 'Domain knowledge' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'resume', label: 'Resume quality' },
];

const TAG_KEYS = FEEDBACK_TAGS.map((tag) => tag.key);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, default: '', trim: true, maxlength: 120 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, default: '', trim: true, maxlength: 32 },
    /** The person to call first. Enforced unique per recruiter on save. */
    primary: { type: Boolean, default: false },
  },
  { _id: true },
);

const feedbackSchema = new mongoose.Schema(
  {
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },
    givenAt: { type: Date, default: Date.now },
    /** 1–5 on the cohort they saw, not on the college's hospitality. */
    rating: { type: Number, min: 1, max: 5, required: true },
    strengths: { type: [{ type: String, enum: TAG_KEYS }], default: [] },
    gaps: { type: [{ type: String, enum: TAG_KEYS }], default: [] },
    notes: { type: String, default: '', maxlength: 2000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const interactionSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'visit', 'other'],
      default: 'call',
    },
    summary: { type: String, required: true, trim: true, maxlength: 1000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

/**
 * A hiring relationship with a company.
 *
 * Separate from the `Company` prep hub, which is student-facing content about
 * how a company interviews. This is the placement office's own record: who to
 * call, what was said, and what they thought of the cohort.
 *
 * Visit and hiring history is deliberately NOT stored here — it is derived
 * from drives and offers on read. A stored count drifts the moment someone
 * edits a drive, and a CRM that disagrees with the placement report is worse
 * than no CRM.
 */
const recruiterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160, index: true },
    /** Links to the prep hub when one exists, so the two can be shown together. */
    companySlug: { type: String, default: '', trim: true, lowercase: true },

    industry: { type: String, default: '', trim: true, maxlength: 120 },
    website: { type: String, default: '', trim: true, maxlength: 300 },
    location: { type: String, default: '', trim: true, maxlength: 160 },

    status: {
      type: String,
      enum: ['prospect', 'active', 'dormant', 'lost'],
      default: 'prospect',
      index: true,
    },

    /** Typical package offered, in rupees per annum, for sorting the pipeline. */
    typicalCtc: { type: Number, default: null, min: 0 },

    contacts: { type: [contactSchema], default: [] },
    feedback: { type: [feedbackSchema], default: [] },
    interactions: { type: [interactionSchema], default: [] },

    notes: { type: String, default: '', maxlength: 4000 },
    ownedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// One relationship record per company, however the name is cased.
recruiterSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
recruiterSchema.index({ status: 1, name: 1 });

/** Exactly one primary contact: the last one flagged wins. */
recruiterSchema.pre('save', function onePrimaryContact(next) {
  const primaries = this.contacts.filter((contact) => contact.primary);

  if (primaries.length > 1) {
    const keep = primaries.at(-1);
    for (const contact of this.contacts) {
      contact.primary = contact === keep;
    }
  }

  next();
});

recruiterSchema.virtual('primaryContact').get(function primaryContact() {
  return this.contacts.find((contact) => contact.primary) ?? this.contacts[0] ?? null;
});

recruiterSchema.set('toJSON', { virtuals: true });
recruiterSchema.set('toObject', { virtuals: true });

export const Recruiter = mongoose.model('Recruiter', recruiterSchema);
