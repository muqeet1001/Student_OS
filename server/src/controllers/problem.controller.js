import mongoose from 'mongoose';
import { Problem } from '../models/Problem.js';
import { Bookmark, SolvedProblem, Submission } from '../models/Submission.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validated } from '../middleware/validate.js';
import { runJavaScript, VERDICT_LABELS } from '../services/codeRunner/index.js';
import { computeActivity, computeStreak } from '../services/streak.service.js';

/** Test data for hidden cases must never reach the client. */
function redactResults(results = []) {
  return results.map((result) =>
    result.hidden
      ? {
          name: result.name || 'Hidden case',
          hidden: true,
          passed: result.passed,
          runtimeMs: result.runtimeMs,
          ...(result.error ? { error: result.error } : {}),
        }
      : result,
  );
}

export const listProblems = asyncHandler(async (req, res) => {
  const { search, difficulty, topic, company, status, page, limit } = validated(req, 'query');

  const filter = { isPublished: true };
  if (difficulty) filter.difficulty = difficulty;
  if (topic) filter.topics = topic;
  if (company) filter.companies = company;
  if (search) filter.$text = { $search: search };

  // "Solved" and "unsolved" need the caller's own progress folded into the query.
  if (status && req.user) {
    const solved = await SolvedProblem.find({ user: req.user._id }).select('problem').lean();
    const ids = solved.map((entry) => entry.problem);
    filter._id = status === 'solved' ? { $in: ids } : { $nin: ids };
  }

  const skip = (page - 1) * limit;

  const [problems, total, solvedRows, bookmarkRows] = await Promise.all([
    Problem.find(filter)
      .select('slug title difficulty topics companies stats createdAt')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Problem.countDocuments(filter),
    req.user ? SolvedProblem.find({ user: req.user._id }).select('problem').lean() : [],
    req.user
      ? Bookmark.find({ user: req.user._id, targetType: 'problem' }).select('target').lean()
      : [],
  ]);

  const solvedIds = new Set(solvedRows.map((row) => String(row.problem)));
  const bookmarkedIds = new Set(bookmarkRows.map((row) => String(row.target)));

  res.json({
    success: true,
    data: {
      problems: problems.map((problem) => ({
        ...problem,
        acceptanceRate: problem.stats?.submissions
          ? Math.round((problem.stats.accepted / problem.stats.submissions) * 100)
          : 0,
        solved: solvedIds.has(String(problem._id)),
        bookmarked: bookmarkedIds.has(String(problem._id)),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

export const getProblem = asyncHandler(async (req, res) => {
  // Test cases and the reference solution are `select: false`; visible cases
  // are pulled in explicitly and filtered below.
  const problem = await Problem.findOne({ slug: req.params.slug, isPublished: true }).select(
    '+testCases',
  );
  if (!problem) throw ApiError.notFound('That problem does not exist');

  const [solved, bookmark, lastSubmission] = req.user
    ? await Promise.all([
        SolvedProblem.exists({ user: req.user._id, problem: problem._id }),
        Bookmark.exists({ user: req.user._id, target: problem._id }),
        Submission.findOne({ user: req.user._id, problem: problem._id })
          .sort({ createdAt: -1 })
          .select('code verdict createdAt')
          .lean(),
      ])
    : [null, null, null];

  const payload = problem.toJSON();
  payload.sampleTestCases = problem.testCases
    .filter((test) => !test.hidden)
    .map((test) => ({ _id: test._id, name: test.name, input: test.input, expectedOutput: test.expectedOutput }));
  payload.hiddenTestCount = problem.testCases.filter((test) => test.hidden).length;
  delete payload.testCases;

  res.json({
    success: true,
    data: {
      problem: payload,
      solved: Boolean(solved),
      bookmarked: Boolean(bookmark),
      lastSubmission: lastSubmission || null,
    },
  });
});

/** Runs the visible cases only, and never records a submission. */
export const runCode = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug, isPublished: true }).select(
    '+testCases',
  );
  if (!problem) throw ApiError.notFound('That problem does not exist');

  const visible = problem.testCases.filter((test) => !test.hidden);

  const report = await runJavaScript({
    code: req.body.code,
    functionName: problem.functionName,
    timeoutMs: problem.timeoutMs,
    tests: visible.map((test) => ({
      name: test.name,
      input: test.input,
      expectedOutput: test.expectedOutput,
      hidden: false,
    })),
  });

  res.json({
    success: true,
    data: {
      ...report,
      verdictLabel: VERDICT_LABELS[report.status] ?? report.status,
      results: redactResults(report.results),
    },
  });
});

/** Runs every case, records the attempt and updates progress. */
export const submitCode = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug, isPublished: true }).select(
    '+testCases',
  );
  if (!problem) throw ApiError.notFound('That problem does not exist');
  if (!problem.testCases.length) {
    throw ApiError.badRequest('This problem has no test cases yet');
  }

  const report = await runJavaScript({
    code: req.body.code,
    functionName: problem.functionName,
    timeoutMs: problem.timeoutMs,
    tests: problem.testCases.map((test) => ({
      name: test.name,
      input: test.input,
      expectedOutput: test.expectedOutput,
      hidden: test.hidden,
    })),
  });

  const passedCount = report.results.filter((result) => result.passed).length;
  const accepted = report.status === 'accepted';

  const submission = await Submission.create({
    user: req.user._id,
    problem: problem._id,
    code: req.body.code,
    verdict: report.status,
    message: report.message || '',
    passedCount,
    totalCount: problem.testCases.length,
    runtimeMs: report.totalRuntimeMs || 0,
    memoryBytes: report.memoryBytes || 0,
  });

  await Problem.updateOne(
    { _id: problem._id },
    { $inc: { 'stats.submissions': 1, 'stats.accepted': accepted ? 1 : 0 } },
  );

  let firstSolve = false;
  if (accepted) {
    try {
      await SolvedProblem.create({
        user: req.user._id,
        problem: problem._id,
        difficulty: problem.difficulty,
      });
      firstSolve = true;
    } catch (error) {
      // Duplicate key means it was already solved — re-solving is not an error.
      if (error.code !== 11000) throw error;
    }
  }

  res.status(201).json({
    success: true,
    data: {
      ...report,
      verdictLabel: VERDICT_LABELS[report.status] ?? report.status,
      results: redactResults(report.results),
      submissionId: submission._id,
      passedCount,
      totalCount: problem.testCases.length,
      firstSolve,
    },
  });
});

export const listSubmissions = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).select('_id').lean();
  if (!problem) throw ApiError.notFound('That problem does not exist');

  const submissions = await Submission.find({ user: req.user._id, problem: problem._id })
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();

  res.json({
    success: true,
    data: {
      submissions: submissions.map((submission) => ({
        ...submission,
        verdictLabel: VERDICT_LABELS[submission.verdict] ?? submission.verdict,
      })),
    },
  });
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).select('_id').lean();
  if (!problem) throw ApiError.notFound('That problem does not exist');

  const existing = await Bookmark.findOneAndDelete({ user: req.user._id, target: problem._id });

  if (!existing) {
    await Bookmark.create({
      user: req.user._id,
      targetType: 'problem',
      target: problem._id,
      targetModel: 'Problem',
    });
  }

  res.json({ success: true, data: { bookmarked: !existing } });
});

/** Solved counts by difficulty, streak and recent activity. */
export const getCodingStats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const [byDifficulty, totals, streak, activity] = await Promise.all([
    SolvedProblem.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),
    Problem.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),
    computeStreak(userId),
    computeActivity(userId, 30),
  ]);

  const shape = (rows) =>
    rows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), { easy: 0, medium: 0, hard: 0 });

  const solved = shape(byDifficulty);
  const available = shape(totals);

  res.json({
    success: true,
    data: {
      solved,
      available,
      totalSolved: solved.easy + solved.medium + solved.hard,
      totalAvailable: available.easy + available.medium + available.hard,
      streak,
      activity,
    },
  });
});

export const listTopicsAndCompanies = asyncHandler(async (_req, res) => {
  const [topics, companies] = await Promise.all([
    Problem.distinct('topics', { isPublished: true }),
    Problem.distinct('companies', { isPublished: true }),
  ]);

  res.json({ success: true, data: { topics: topics.sort(), companies: companies.sort() } });
});
