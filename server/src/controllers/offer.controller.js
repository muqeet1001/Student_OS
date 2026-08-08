import { Offer } from '../models/Offer.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { buildPlacementReport } from '../services/placementReport.js';
import { buildAlumniStats } from '../services/alumniStats.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listOffers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.company) filter.company = new RegExp(`^${req.query.company}$`, 'i');

  const offers = await Offer.find(filter)
    .populate('student', 'name email')
    .populate('drive', 'company role')
    .sort({ offeredAt: -1 })
    .lean();

  res.json({ success: true, data: { offers } });
});

export const createOffer = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.body.student, role: 'student' }).lean();
  if (!student) throw new ApiError(404, 'Student not found.');

  const offer = await Offer.create({ ...req.body, recordedBy: req.user._id });
  await offer.populate('student', 'name email');

  res.status(201).json({ success: true, data: { offer } });
});

export const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findByIdAndUpdate(req.params.offerId, req.body, {
    new: true,
    runValidators: true,
  }).populate('student', 'name email');

  if (!offer) throw new ApiError(404, 'Offer not found.');
  res.json({ success: true, data: { offer } });
});

export const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findByIdAndDelete(req.params.offerId);
  if (!offer) throw new ApiError(404, 'Offer not found.');

  res.json({ success: true, data: { message: 'Offer deleted.' } });
});

/** Loads the cohort, then hands the counting to the report service. */
export const placementReport = asyncHandler(async (req, res) => {
  const year = req.query.graduationYear ? Number(req.query.graduationYear) : null;

  // Scope to a graduating cohort when asked, since a placement rate is only
  // meaningful against the batch it is drawn from.
  let cohortIds = null;
  if (year) {
    const scoped = await Profile.find({ graduationYear: year }).select('user').lean();
    cohortIds = scoped.map((profile) => profile.user);
  }

  const [totalStudents, offers, profiles] = await Promise.all([
    User.countDocuments({ role: 'student', ...(cohortIds && { _id: { $in: cohortIds } }) }),
    Offer.find(cohortIds ? { student: { $in: cohortIds } } : {})
      .populate('student', 'name')
      .lean(),
    Profile.find(cohortIds ? { user: { $in: cohortIds } } : {})
      .select('user branch')
      .lean(),
  ]);

  res.json({
    success: true,
    data: buildPlacementReport({ totalStudents, offers, profiles, graduationYear: year }),
  });
});

/**
 * Placement history by graduating batch.
 *
 * Drawn from the offers already recorded rather than kept as a separate
 * table, so last year's published figure and this year's live one are
 * computed the same way and cannot drift apart.
 */
export const alumniHistory = asyncHandler(async (req, res) => {
  const [profiles, offers] = await Promise.all([
    Profile.find({ graduationYear: { $ne: null } })
      .select('user graduationYear branch')
      .lean(),
    Offer.find({}).select('student company status ctc').lean(),
  ]);

  res.json({ success: true, data: buildAlumniStats({ profiles, offers }) });
});
