import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    category: {
      type: String,
      enum: ['programming', 'frontend', 'backend', 'database', 'cloud', 'soft', 'other'],
      default: 'other',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
    // Set when the skill has been backed by a passing skill-test attempt.
    verified: { type: Boolean, default: false },
  },
  { _id: true },
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 600 },
    techStack: { type: [String], default: [] },
    repoUrl: { type: String, default: '' },
    liveUrl: { type: String, default: '' },
    featured: { type: Boolean, default: false },
  },
  { _id: true },
);

const certificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    issuer: { type: String, default: '', maxlength: 120 },
    credentialId: { type: String, default: '', maxlength: 120 },
    credentialUrl: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    issuedAt: { type: Date },
  },
  { _id: true },
);

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true, trim: true, maxlength: 160 },
    degree: { type: String, default: '', maxlength: 120 },
    fieldOfStudy: { type: String, default: '', maxlength: 120 },
    startYear: { type: Number, min: 1950, max: 2100 },
    endYear: { type: Number, min: 1950, max: 2100 },
    grade: { type: String, default: '', maxlength: 40 },
  },
  { _id: true },
);

const experienceSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, default: '', maxlength: 120 },
    location: { type: String, default: '', maxlength: 120 },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    highlights: { type: [String], default: [] },
  },
  { _id: true },
);

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    headline: { type: String, default: '', maxlength: 160 },
    bio: { type: String, default: '', maxlength: 1000 },
    phone: { type: String, default: '', maxlength: 32 },
    location: { type: String, default: '', maxlength: 120 },
    graduationYear: { type: Number, min: 1950, max: 2100 },
    branch: { type: String, default: '', maxlength: 120 },
    track: {
      type: String,
      enum: ['technical', 'management', 'design', 'undecided'],
      default: 'undecided',
    },
    links: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      portfolio: { type: String, default: '' },
      leetcode: { type: String, default: '' },
    },
    targetRoles: { type: [String], default: [] },
    targetCompanies: { type: [String], default: [] },

    skills: { type: [skillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
  },
  { timestamps: true },
);

/** Returns the caller's profile, creating an empty one on first access. */
profileSchema.statics.findOrCreateFor = async function findOrCreateFor(userId) {
  const existing = await this.findOne({ user: userId });
  if (existing) return existing;
  return this.create({ user: userId });
};

/**
 * Rough completeness signal (0-100) used by the dashboard readiness score.
 * Weighted so the sections recruiters actually read count for most.
 */
profileSchema.methods.completeness = function completeness() {
  const checks = [
    [Boolean(this.headline), 10],
    [Boolean(this.bio), 10],
    [Boolean(this.location), 5],
    [Boolean(this.graduationYear), 5],
    [Boolean(this.branch), 5],
    [this.skills.length >= 5, 20],
    [this.projects.length >= 2, 20],
    [this.education.length >= 1, 15],
    [Boolean(this.links.github || this.links.linkedin), 10],
  ];

  const earned = checks.reduce((total, [passed, weight]) => total + (passed ? weight : 0), 0);
  return Math.min(100, earned);
};

export const Profile = mongoose.model('Profile', profileSchema);
