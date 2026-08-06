import { Question, QuestionProgress } from '../models/Question.js';
import { Bookmark } from '../models/Submission.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validated } from '../middleware/validate.js';

export const listQuestions = asyncHandler(async (req, res) => {
  const { search, company, year, topic, round, difficulty, status, page, limit } = validated(
    req,
    'query',
  );

  const filter = { isPublished: true };
  if (company) filter.company = company;
  if (year) filter.year = year;
  if (topic) filter.topics = topic;
  if (round) filter.round = round;
  if (difficulty) filter.difficulty = difficulty;
  if (search) filter.$text = { $search: search };

  if (status && req.user) {
    const progress = await QuestionProgress.find({ user: req.user._id, status: 'solved' })
      .select('question')
      .lean();
    const ids = progress.map((entry) => entry.question);
    filter._id = status === 'solved' ? { $in: ids } : { $nin: ids };
  }

  const skip = (page - 1) * limit;

  const [questions, total, progressRows, bookmarkRows] = await Promise.all([
    Question.find(filter)
      // The full answer is withheld from list responses to keep them small.
      .select('-answer')
      .populate('problem', 'slug title difficulty')
      .sort(search ? { score: { $meta: 'textScore' } } : { year: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
    req.user ? QuestionProgress.find({ user: req.user._id }).select('question status').lean() : [],
    req.user
      ? Bookmark.find({ user: req.user._id, targetType: 'question' }).select('target').lean()
      : [],
  ]);

  const progressByQuestion = new Map(progressRows.map((row) => [String(row.question), row.status]));
  const bookmarkedIds = new Set(bookmarkRows.map((row) => String(row.target)));

  res.json({
    success: true,
    data: {
      questions: questions.map((question) => ({
        ...question,
        progress: progressByQuestion.get(String(question._id)) ?? null,
        bookmarked: bookmarkedIds.has(String(question._id)),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

export const getQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOneAndUpdate(
    { _id: req.params.id, isPublished: true },
    { $inc: { 'stats.views': 1 } },
    { new: true },
  ).populate('problem', 'slug title difficulty');

  if (!question) throw ApiError.notFound('That question does not exist');

  const [progress, bookmark] = req.user
    ? await Promise.all([
        QuestionProgress.findOne({ user: req.user._id, question: question._id }).lean(),
        Bookmark.exists({ user: req.user._id, target: question._id }),
      ])
    : [null, null];

  res.json({
    success: true,
    data: {
      question,
      progress: progress ?? null,
      bookmarked: Boolean(bookmark),
    },
  });
});

/** Marks a question solved or flagged for revision, and stores private notes. */
export const setProgress = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id).select('_id').lean();
  if (!question) throw ApiError.notFound('That question does not exist');

  const { status, notes } = req.body;

  if (status === null) {
    await QuestionProgress.deleteOne({ user: req.user._id, question: question._id });
    return res.json({ success: true, data: { progress: null } });
  }

  const previous = await QuestionProgress.findOne({ user: req.user._id, question: question._id });

  const progress = await QuestionProgress.findOneAndUpdate(
    { user: req.user._id, question: question._id },
    { $set: { status, ...(notes === undefined ? {} : { notes }) } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  // Count a solve only the first time, so toggling does not inflate the stat.
  if (status === 'solved' && previous?.status !== 'solved') {
    await Question.updateOne({ _id: question._id }, { $inc: { 'stats.solves': 1 } });
  }

  return res.json({ success: true, data: { progress } });
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id).select('_id').lean();
  if (!question) throw ApiError.notFound('That question does not exist');

  const existing = await Bookmark.findOneAndDelete({ user: req.user._id, target: question._id });

  if (!existing) {
    await Bookmark.create({
      user: req.user._id,
      targetType: 'question',
      target: question._id,
      targetModel: 'Question',
    });
  }

  res.json({ success: true, data: { bookmarked: !existing } });
});

/** Companies with question counts, plus the filter vocabularies. */
export const listFilters = asyncHandler(async (_req, res) => {
  const [companies, topics, years] = await Promise.all([
    Question.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 40 },
    ]),
    Question.distinct('topics', { isPublished: true }),
    Question.distinct('year', { isPublished: true }),
  ]);

  res.json({
    success: true,
    data: {
      companies: companies.map((row) => ({ name: row._id, count: row.count })),
      topics: topics.sort(),
      years: years.sort((a, b) => b - a),
    },
  });
});
