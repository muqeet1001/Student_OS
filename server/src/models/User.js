import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const refreshTokenSchema = new mongoose.Schema(
  {
    // Only a hash of the refresh token is stored, so a database leak cannot be
    // replayed against the API.
    tokenHash: { type: String, required: true },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      index: true,
    },
    staffRole: {
      type: String,
      enum: ['placement-head', 'officer', 'faculty-coordinator', 'viewer'],
      default: 'placement-head',
    },
    avatarUrl: { type: String, default: '' },
    headline: { type: String, default: '', maxlength: 120 },
    isActive: { type: Boolean, default: true },
    /*
     * Set when the placement office issues a temporary password, cleared the
     * moment the student replaces it.
     *
     * The office has to be able to hand a locked-out student a way back in, and
     * the only credential they can hand over is one they have seen. This flag is
     * what stops that credential remaining valid indefinitely: every route is
     * closed until it is replaced.
     */
    mustChangePassword: { type: Boolean, default: false },

    /*
     * When the address was proved to belong to this account. Null means it has
     * never been proved — which is the state every existing row is in, and the
     * state a row stays in when the installation has no mail relay configured.
     *
     * A timestamp rather than a boolean, for the same reason `usedAt` is one on
     * the token collection: "verified" is a claim someone will one day have to
     * audit, and "verified on 14 March" is answerable where "verified: true" is
     * not.
     *
     * Nothing is gated on this. Sign-in, practice and applications all work
     * unverified, because gating them would lock out every student on an
     * installation that cannot send email — and the placement office can issue
     * a password but not an inbox.
     */
    emailVerifiedAt: { type: Date, default: null },

    lastLoginAt: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    /*
     * Notification categories the student wants. Stored sparsely: a category
     * absent here is treated as on, so adding a new one does not require
     * backfilling every existing user.
     *
     * Journey-level delivery channels live on StudentJourney because those
     * preferences also carry explicit consent history. These settings only
     * control which categories appear in the in-app notification feed.
     */
    settings: {
      notifications: {
        type: Map,
        of: Boolean,
        default: () => new Map(),
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
