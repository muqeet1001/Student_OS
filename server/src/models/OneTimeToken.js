import mongoose from 'mongoose';

/**
 * A single-use grant, scoped to one purpose.
 *
 * Two flows need this — setting a password after losing it, and proving an
 * email address — and they need identical properties: random, hashed at rest,
 * expiring, claimed in one conditional write, and kept afterwards for the audit
 * trail. Two separate models would have meant two copies of the claim logic,
 * and a single-use guarantee is exactly the kind of thing that goes missing
 * from the second copy.
 *
 * `purpose` keeps the two apart without splitting the implementation. It is
 * part of every lookup rather than inferred from context, because without it a
 * link issued to set a password would also satisfy a request to prove an email
 * address — and those are not the same claim about the person holding it.
 *
 * Only the SHA-256 hash is stored, for the same reason refresh tokens are
 * hashed: a database leak must not hand someone the ability to take over an
 * account that is currently waiting to be recovered.
 *
 * Used rows are kept rather than deleted. "This account's password was set at
 * 02:14, from a link issued at 01:58" is the question asked after a disputed
 * takeover, and a deleted row cannot answer it. Nothing about the credential
 * itself is recoverable from what is kept here.
 */
const oneTimeTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: {
      type: String,
      enum: ['password-reset', 'email-verification'],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    // Null while the grant is still live. Set in one conditional write when it
    // is claimed, which is what makes it single-use.
    usedAt: { type: Date, default: null },
    userAgent: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true },
);

// Every presentation of a link looks up by hash. The unique index on the field
// itself is what makes that a point read rather than a scan.
//
// Retiring one account's outstanding grants for one purpose, and finding the
// live one.
oneTimeTokenSchema.index({ user: 1, purpose: 1, usedAt: 1 });
// Lets expired rows be reaped without walking the collection.
oneTimeTokenSchema.index({ expiresAt: 1 });

export const OneTimeToken = mongoose.model('OneTimeToken', oneTimeTokenSchema);

/** The purposes this collection serves. Kept beside the enum it mirrors. */
export const TOKEN_PURPOSES = Object.freeze(['password-reset', 'email-verification']);
