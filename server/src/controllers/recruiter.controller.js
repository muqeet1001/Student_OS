import crypto from 'node:crypto';
import { Recruiter, RecruiterPortalInvite, FEEDBACK_TAGS } from '../models/Recruiter.js';
import { Drive } from '../models/Drive.js';
import { Offer } from '../models/Offer.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  recommendFromFeedback,
  relationshipHealth,
  summariseFeedback,
} from '../services/recruiterInsights.js';
import { recordAudit } from '../services/audit.service.js';

/** Case-insensitive exact match, so "infosys" finds the "Infosys" drives. */
const sameCompany = (name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

export const listRecruiters = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

  const recruiters = await Recruiter.find(filter).sort({ name: 1 }).lean({ virtuals: true });

  // Drives and offers are loaded once for the whole page rather than per
  // company, so the list does not fan out into N queries.
  const names = recruiters.map((recruiter) => recruiter.name);
  const [drives, offers] = await Promise.all([
    Drive.find({ company: { $in: names.map(sameCompany) } })
      .select('company driveDate shortlist')
      .lean(),
    Offer.find({ company: { $in: names.map(sameCompany) } })
      .select('company student status ctc')
      .lean(),
  ]);

  const byCompany = (rows) => {
    const map = new Map();
    for (const row of rows) {
      const key = row.company.toLowerCase();
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
  };

  const drivesByCompany = byCompany(drives);
  const offersByCompany = byCompany(offers);

  const withHealth = recruiters.map((recruiter) => ({
    ...recruiter,
    health: relationshipHealth(recruiter, {
      drives: drivesByCompany.get(recruiter.name.toLowerCase()) ?? [],
      offers: offersByCompany.get(recruiter.name.toLowerCase()) ?? [],
    }),
  }));

  const summary = summariseFeedback(recruiters);

  res.json({
    success: true,
    data: {
      recruiters: withHealth,
      summary,
      recommendations: recommendFromFeedback(summary),
      tags: FEEDBACK_TAGS,
      totals: {
        companies: recruiters.length,
        active: recruiters.filter((entry) => entry.status === 'active').length,
        stale: withHealth.filter((entry) => entry.health.stale).length,
      },
    },
  });
});

export const getRecruiter = asyncHandler(async (req, res) => {
  const recruiter = await Recruiter.findById(req.params.recruiterId).lean({ virtuals: true });
  if (!recruiter) throw new ApiError(404, 'Company not found.');

  const [drives, offers] = await Promise.all([
    Drive.find({ company: sameCompany(recruiter.name) })
      .select('company role driveDate status shortlist')
      .sort({ driveDate: -1 })
      .lean(),
    Offer.find({ company: sameCompany(recruiter.name) })
      .select('company student status ctc role offeredAt')
      .populate('student', 'name email')
      .sort({ offeredAt: -1 })
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      recruiter,
      // Derived on read so the CRM can never disagree with the drives table.
      health: relationshipHealth(recruiter, { drives, offers }),
      drives,
      offers,
      tags: FEEDBACK_TAGS,
    },
  });
});

export const createRecruiter = asyncHandler(async (req, res) => {
  const existing = await Recruiter.findOne({ name: sameCompany(req.body.name) }).lean();
  if (existing) throw new ApiError(409, 'A record for that company already exists.');

  const recruiter = await Recruiter.create({ ...req.body, ownedBy: req.user._id });
  await recordAudit({ actor: req.user._id, action: 'company.created', entityType: 'company', entityId: recruiter._id, summary: `Created company relationship for ${recruiter.name}`, metadata: { status: recruiter.status } });
  res.status(201).json({ success: true, data: { recruiter } });
});

export const updateRecruiter = asyncHandler(async (req, res) => {
  const recruiter = await Recruiter.findById(req.params.recruiterId);
  if (!recruiter) throw new ApiError(404, 'Company not found.');

  Object.assign(recruiter, req.body);
  await recruiter.save();
  await recordAudit({ actor: req.user._id, action: 'company.updated', entityType: 'company', entityId: recruiter._id, summary: `Updated ${recruiter.name}`, metadata: req.body });

  res.json({ success: true, data: { recruiter } });
});

export const deleteRecruiter = asyncHandler(async (req, res) => {
  const recruiter = await Recruiter.findByIdAndDelete(req.params.recruiterId);
  if (!recruiter) throw new ApiError(404, 'Company not found.');

  res.json({ success: true, data: { message: 'Company removed.' } });
});

/** Appends to one of the recruiter's sub-collections. */
function appendTo(field, decorate = (body) => body, action = field) {
  return asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findById(req.params.recruiterId);
    if (!recruiter) throw new ApiError(404, 'Company not found.');

    recruiter[field].push(decorate(req.body, req));
    await recruiter.save();
    await recordAudit({ actor: req.user._id, action: `company.${action}.added`, entityType: 'company', entityId: recruiter._id, summary: `Added ${action} for ${recruiter.name}`, metadata: req.body });

    res.status(201).json({ success: true, data: { recruiter } });
  });
}

export const addContact = appendTo('contacts', (body) => body, 'contact');
export const addFeedback = appendTo('feedback', (body, req) => ({
  ...body,
  recordedBy: req.user._id,
}), 'feedback');
export const addInteraction = appendTo('interactions', (body, req) => ({
  ...body,
  recordedBy: req.user._id,
}), 'interaction');

/** Removes one entry from a sub-collection. */
function removeFrom(field) {
  return asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findById(req.params.recruiterId);
    if (!recruiter) throw new ApiError(404, 'Company not found.');

    const entry = recruiter[field].id(req.params.entryId);
    if (!entry) throw new ApiError(404, 'Entry not found.');

    entry.deleteOne();
    await recruiter.save();

    res.json({ success: true, data: { recruiter } });
  });
}

export const removeContact = removeFrom('contacts');
export const removeFeedback = removeFrom('feedback');

const portalHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const createPortalInvite = asyncHandler(async (req, res) => {
  const recruiter = await Recruiter.findById(req.params.recruiterId).select('name').lean();
  if (!recruiter) throw ApiError.notFound('Company not found.');
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 14 * 86_400_000);
  await RecruiterPortalInvite.create({ recruiter: recruiter._id, tokenHash: portalHash(token), expiresAt, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { path: `/recruiter-feedback/${token}`, expiresAt, company: recruiter.name } });
});

async function portalInvite(token) {
  return RecruiterPortalInvite.findOne({ tokenHash: portalHash(token), expiresAt: { $gt: new Date() }, usedAt: null }).select('+tokenHash');
}

export const viewPortal = asyncHandler(async (req, res) => {
  const invite = await portalInvite(req.params.token);
  if (!invite) throw ApiError.notFound('This feedback link is invalid or has expired.');
  const recruiter = await Recruiter.findById(invite.recruiter).select('name').lean();
  if (!recruiter) throw ApiError.notFound('Company not found.');
  res.json({ success: true, data: { company: recruiter.name, tags: FEEDBACK_TAGS, expiresAt: invite.expiresAt } });
});

export const submitPortalFeedback = asyncHandler(async (req, res) => {
  const usedAt = new Date();
  const invite = await RecruiterPortalInvite.findOneAndUpdate(
    { tokenHash: portalHash(req.params.token), expiresAt: { $gt: usedAt }, usedAt: null },
    { $set: { usedAt } },
    { new: true },
  );
  if (!invite) throw ApiError.notFound('This feedback link is invalid or has expired.');
  const recruiter = await Recruiter.findById(invite.recruiter);
  if (!recruiter) throw ApiError.notFound('Company not found.');
  recruiter.feedback.push({ ...req.body, givenAt: new Date() });
  try {
    await recruiter.save();
  } catch (error) {
    await RecruiterPortalInvite.updateOne({ _id: invite._id, usedAt }, { $set: { usedAt: null } }).catch(() => {});
    throw error;
  }
  res.status(201).json({ success: true, data: { message: 'Thank you. Your feedback was shared with the placement office.' } });
});
