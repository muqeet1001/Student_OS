import { Company } from '../models/Company.js';
import { Question, QuestionProgress } from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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

  const questions = await Question.find({
    company: new RegExp(`^${company.name}$`, 'i'),
    isPublished: true,
  })
    .select('title round difficulty topics year askedCount problem')
    .populate('problem', 'slug title difficulty')
    .sort({ askedCount: -1, year: -1 })
    .limit(10)
    .lean();

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
      topQuestions: questions.map((question) => ({
        ...question,
        progress: statusById.get(String(question._id)) ?? null,
      })),
    },
  });
});
