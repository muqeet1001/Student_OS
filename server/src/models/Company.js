import mongoose from 'mongoose';

const roundSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    /** Free text because rounds vary: "45 mins", "4–5 rounds", "half day". */
    duration: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const insightSchema = new mongoose.Schema(
  {
    quote: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    role: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const companySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },

    /** Rendered as a monogram; avoids hotlinking logos we have no licence to. */
    logoText: { type: String, default: '', trim: true, maxlength: 2 },
    brandColor: {
      type: String,
      default: '#a83206',
      match: [/^#[0-9a-f]{6}$/i, 'Brand colour must be hex'],
    },

    tier: { type: String, enum: ['expert', 'top', 'growth'], default: 'top', index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium', index: true },

    tagline: { type: String, default: '', trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1200 },
    processDuration: { type: String, default: '', trim: true },

    rounds: { type: [roundSchema], default: [] },
    insights: { type: [insightSchema], default: [] },
    focusAreas: { type: [String], default: [] },

    /** Roles this prep hub is written for. */
    roles: { type: [String], default: [] },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

companySchema.index({ tier: 1, name: 1 });

export const Company = mongoose.model('Company', companySchema);
