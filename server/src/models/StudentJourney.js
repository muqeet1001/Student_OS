import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ['camera-proctoring', 'public-profile', 'referrals', 'email', 'whatsapp', 'data-sharing'],
      required: true,
    },
    granted: { type: Boolean, required: true },
    source: { type: String, enum: ['onboarding', 'settings', 'feature'], default: 'settings' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const studentJourneySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    onboarding: {
      completedAt: { type: Date, default: null },
      placementDate: { type: Date, default: null },
      weeklyGoal: { type: Number, min: 1, max: 20, default: 5 },
      baseline: {
        capturedAt: { type: Date, default: null },
        score: { type: Number, min: 0, max: 100, default: null },
        components: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    },
    locale: { type: String, enum: ['en', 'hi'], default: 'en' },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    integrations: {
      calendar: { type: String, enum: ['disconnected', 'ics'], default: 'disconnected' },
      sis: { type: String, enum: ['disconnected', 'managed'], default: 'disconnected' },
    },
    consentHistory: { type: [consentSchema], default: [] },
  },
  { timestamps: true },
);

studentJourneySchema.statics.findOrCreateFor = async function findOrCreateFor(userId) {
  return this.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const messageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const actionItemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null, index: true },
    source: { type: String, enum: ['self', 'staff', 'system'], default: 'self' },
    category: {
      type: String,
      enum: ['application', 'preparation', 'document', 'review', 'meeting', 'other'],
      default: 'other',
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: '', maxlength: 2000 },
    dueAt: { type: Date, default: null, index: true },
    status: { type: String, enum: ['todo', 'done', 'dismissed'], default: 'todo', index: true },
    link: { type: String, default: '', maxlength: 300 },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Staff-side workflow ownership is separate from the student receiving the action. */
    staffOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    signalKey: { type: String, default: '', trim: true, maxlength: 80 },
    resolution: { type: String, default: '', trim: true, maxlength: 1000 },
    resolvedAt: { type: Date, default: null },
    reminderChannels: {
      type: [String],
      enum: ['in-app', 'email', 'whatsapp'],
      default: ['in-app'],
    },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

actionItemSchema.index({ owner: 1, status: 1, dueAt: 1 });

const mentorAppointmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mentorName: { type: String, default: '', maxlength: 120 },
    topic: { type: String, required: true, trim: true, maxlength: 180 },
    note: { type: String, default: '', maxlength: 2000 },
    startsAt: { type: Date, default: null },
    status: { type: String, enum: ['requested', 'scheduled', 'completed', 'cancelled'], default: 'requested', index: true },
  },
  { timestamps: true },
);

const institutionConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    name: { type: String, default: 'Student OS Institution', maxlength: 160 },
    placementSeasonName: { type: String, default: '', maxlength: 80 },
    activeGraduationYear: { type: Number, default: null, min: 1950, max: 2100 },
    readinessWeights: {
      skills: { type: Number, default: 20, min: 0, max: 100 },
      coding: { type: Number, default: 30, min: 0, max: 100 },
      resume: { type: Number, default: 20, min: 0, max: 100 },
      interview: { type: Number, default: 20, min: 0, max: 100 },
      projects: { type: Number, default: 10, min: 0, max: 100 },
    },
    skillTaxonomy: { type: [String], default: [] },
    enabledLocales: { type: [String], enum: ['en', 'hi'], default: ['en'] },
    providers: {
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
      sis: { type: String, enum: ['none', 'csv', 'api'], default: 'none' },
    },
    placementPolicies: {
      maximumActiveOffers: { type: Number, default: 0, min: 0, max: 20 },
      dreamPackage: { type: Number, default: 0, min: 0 },
      superDreamPackage: { type: Number, default: 0, min: 0 },
      minimumPackageImprovementPct: { type: Number, default: 0, min: 0, max: 500 },
      debarAfterNoShows: { type: Number, default: 0, min: 0, max: 20 },
      allowWithdrawal: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const StudentJourney = mongoose.model('StudentJourney', studentJourneySchema);
export const ActionItem = mongoose.model('ActionItem', actionItemSchema);
export const MentorAppointment = mongoose.model('MentorAppointment', mentorAppointmentSchema);
export const InstitutionConfig = mongoose.model('InstitutionConfig', institutionConfigSchema);
