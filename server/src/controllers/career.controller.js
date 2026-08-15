import { Offer } from '../models/Offer.js';
import { Profile } from '../models/Profile.js';
import { loadCohort } from '../services/cohort.service.js';
import { askModel } from '../services/aiClient.js';
import { analyzeGitHubRepository } from '../services/githubAnalyzer.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DESTINATIONS = {
  skills: '/skills', coding: '/coding-practice', resume: '/resume-builder',
  interview: '/ai-interview', projects: '/career-profile',
};

export const askMentor = asyncHandler(async (req, res) => {
  const [student] = await loadCohort({ search: req.user.email });
  const components = student?.components ?? {};
  const ordered = Object.entries(components).sort((a, b) => a[1] - b[1]);
  const weakest = ordered[0] ?? ['profile', 0];
  const actions = ordered.slice(0, 3).map(([key, value]) => ({
    label: `Improve ${key} (${value}%)`,
    to: DESTINATIONS[key] ?? '/my-plan',
  }));
  const fallback = `Your strongest next move is ${weakest[0]} practice. It is currently ${weakest[1]}%, so work on one measurable task there before adding another goal. Then review your progress in My Plan.`;
  const { text, error } = await askModel({
    system: 'You are a concise campus placement mentor. Use only the supplied evidence. Give practical, ethical guidance in under 140 words. Never promise employment.',
    prompt: `Student question: ${req.body.message}\nReadiness: ${student?.readiness ?? 0}%. Evidence: ${JSON.stringify(components)}. Verified skills: ${student?.verifiedSkills ?? 0}. Problems solved: ${student?.solved ?? 0}. Interviews completed: ${student?.interviewsCompleted ?? 0}.`,
    maxTokens: 300,
  });
  res.json({ success: true, data: { answer: text ?? fallback, generated: Boolean(text), aiUnavailableReason: error, actions } });
});

export const analyzeGitHub = asyncHandler(async (req, res) => {
  const analysis = await analyzeGitHubRepository(req.body.repoUrl);
  res.json({ success: true, data: { analysis } });
});

export const alumniNetwork = asyncHandler(async (_req, res) => {
  const profiles = await Profile.find({
    'publicProfile.enabled': true,
    'publicProfile.openToReferrals': true,
  }).populate('user', 'name avatarUrl headline isActive role').lean();
  const eligible = profiles.filter((profile) => profile.user?.isActive && profile.user.role === 'student');
  const ids = eligible.map((profile) => profile.user._id);
  const offers = await Offer.find({ student: { $in: ids }, status: { $in: ['accepted', 'joined'] } })
    .sort({ offeredAt: -1 }).lean();
  const offerByStudent = new Map();
  for (const offer of offers) if (!offerByStudent.has(String(offer.student))) offerByStudent.set(String(offer.student), offer);
  const alumni = eligible.flatMap((profile) => {
    const offer = offerByStudent.get(String(profile.user._id));
    if (!offer) return [];
    return [{
      userId: profile.user._id,
      name: profile.user.name,
      avatarUrl: profile.user.avatarUrl,
      headline: profile.headline || profile.user.headline,
      company: offer.company,
      role: offer.role,
      graduationYear: profile.graduationYear,
      branch: profile.branch,
      skills: (profile.skills ?? []).filter((skill) => skill.verified).slice(0, 5).map((skill) => skill.name),
      linkedin: profile.links?.linkedin ?? '',
    }];
  });
  res.json({ success: true, data: { alumni } });
});
