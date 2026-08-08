import { Profile } from '../models/Profile.js';
import { Resume } from '../models/Resume.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scoreResume } from '../services/atsScore.js';

/** Limit kept low so the list stays a considered set of tailored versions. */
const MAX_VERSIONS = 10;

async function loadProfileAndUser(userId) {
  const [profile, user] = await Promise.all([
    Profile.findOne({ user: userId }).lean(),
    User.findById(userId).select('name email').lean(),
  ]);

  if (!profile) throw new ApiError(404, 'Complete your profile before building a resume.');
  return { profile, user };
}

/**
 * The live builder view: current profile content plus its authoritative
 * score, and the saved versions.
 */
export const getBuilder = asyncHandler(async (req, res) => {
  const { profile, user } = await loadProfileAndUser(req.user._id);
  const report = scoreResume({ profile, user });

  const versions = await Resume.find({ user: req.user._id })
    .select('title targetRole targetCompany template accent atsScore updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ success: true, data: { profile, user, report, versions } });
});

export const listResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id }).sort({ updatedAt: -1 }).lean();
  res.json({ success: true, data: { resumes } });
});

export const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.resumeId, user: req.user._id }).lean();
  if (!resume) throw new ApiError(404, 'Resume not found.');

  res.json({ success: true, data: { resume } });
});

export const createResume = asyncHandler(async (req, res) => {
  const count = await Resume.countDocuments({ user: req.user._id });
  if (count >= MAX_VERSIONS) {
    throw new ApiError(409, `You can keep up to ${MAX_VERSIONS} saved resumes. Delete one first.`);
  }

  const { profile, user } = await loadProfileAndUser(req.user._id);
  const report = scoreResume({ profile, user });

  const resume = await Resume.create({
    ...req.body,
    user: req.user._id,
    // Frozen at save time so an already-sent resume cannot change under the
    // student when they next edit their profile.
    snapshot: { profile, user },
    atsScore: report.score,
    atsChecks: report.checks,
  });

  res.status(201).json({ success: true, data: { resume } });
});

export const updateResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOneAndUpdate(
    { _id: req.params.resumeId, user: req.user._id },
    req.body,
    { new: true, runValidators: true },
  );

  if (!resume) throw new ApiError(404, 'Resume not found.');
  res.json({ success: true, data: { resume } });
});

/** Re-freezes a saved version against the current profile. */
export const refreshResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.resumeId, user: req.user._id });
  if (!resume) throw new ApiError(404, 'Resume not found.');

  const { profile, user } = await loadProfileAndUser(req.user._id);
  const report = scoreResume({ profile, user });

  resume.snapshot = { profile, user };
  resume.atsScore = report.score;
  resume.atsChecks = report.checks;
  await resume.save();

  res.json({ success: true, data: { resume } });
});

export const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOneAndDelete({ _id: req.params.resumeId, user: req.user._id });
  if (!resume) throw new ApiError(404, 'Resume not found.');

  res.json({ success: true, data: { message: 'Resume deleted.' } });
});
