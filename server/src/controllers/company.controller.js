import { Company } from '../models/Company.js';
import { Question, QuestionProgress } from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';

export const listCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find({ active: true })
    .select('slug name logoText brandColor tier difficulty tagline processDuration focusAreas rounds')
    .sort({ tier: 1, name: 1 })
    .lean();

  // Question counts come from the PYQ library, so a hub can never advertise
  // more preparation material than actually exists.
  const counts = await Question.aggregate([
    { $match: { isPublished: true } },
    { $group: { _id: '$company', count: { $sum: 1 } } },
  ]);
  const byName = new Map(counts.map((item) => [item._id.toLowerCase(), item.count]));

  res.json({
    success: true,
    data: {
      companies: companies.map((company) => ({
        ...company,
        roundCount: company.rounds.length,
        rounds: undefined,
        questionCount: byName.get(company.name.toLowerCase()) ?? 0,
      })),
    },
  });
});

export const getCompanyHub = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ slug: req.params.slug, active: true }).lean();
  if (!company) throw new ApiError(404, 'Company prep hub not found.');

  const [questions, cohort] = await Promise.all([Question.find({
    company: new RegExp(`^${company.name}$`, 'i'),
    isPublished: true,
  })
    .select('title round difficulty topics year askedCount problem')
    .populate('problem', 'slug title difficulty')
    .sort({ askedCount: -1, year: -1 })
    .limit(10)
    .lean(), loadCohort({ search: req.user.email })]);

  const student = cohort[0];
  const ownedSkills = (student?.profile?.skills ?? []).map((skill) => skill.name.toLowerCase());
  const requirements = company.focusAreas.map((name) => ({
    name,
    met: ownedSkills.some((skill) => name.toLowerCase().includes(skill) || skill.includes(name.toLowerCase())),
  }));
  const skillsScore = requirements.length
    ? Math.round((requirements.filter((item) => item.met).length / requirements.length) * 100)
    : 0;
  const companyReadiness = Math.round(
    skillsScore * 0.45 + (student?.components?.coding ?? 0) * 0.25 +
    (student?.components?.interview ?? 0) * 0.2 + (student?.components?.profile ?? 0) * 0.1,
  );

  // Mark what the student has already worked through.
  const progress = await QuestionProgress.find({
    user: req.user._id,
    question: { $in: questions.map((item) => item._id) },
  })
    .select('question status')
    .lean();

  const statusById = new Map(progress.map((item) => [String(item.question), item.status]));

  res.json({
    success: true,
    data: {
      company,
      readiness: {
        score: companyReadiness,
        skillsScore,
        requirements,
        coding: student?.components?.coding ?? 0,
        interview: student?.components?.interview ?? 0,
        profile: student?.components?.profile ?? 0,
      },
      topQuestions: questions.map((question) => ({
        ...question,
        progress: statusById.get(String(question._id)) ?? null,
      })),
    },
  });
});
