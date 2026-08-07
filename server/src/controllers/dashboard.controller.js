import { Profile } from '../models/Profile.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { computeStreak } from '../services/streak.service.js';
import { buildNotifications } from '../services/notifications.service.js';

/**
 * Readiness weights. Coding carries the most because it is both the largest
 * body of work and the strongest signal in a technical hiring process.
 */
const WEIGHTS = { profile: 0.2, coding: 0.35, tests: 0.25, interview: 0.2 };

/**
 * Everything the dashboard renders, in one round trip.
 *
 * The score is computed here rather than on the client so that notifications
 * and any future digest reason about exactly the same number.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, solvedDocs, availableCounts, attempts, interviews, streak] = await Promise.all([
    Profile.findOne({ user: userId }).lean(),

    // Distinct accepted problems, with difficulty, in one pass.
    Submission.aggregate([
      { $match: { user: userId, verdict: 'accepted' } },
      { $group: { _id: '$problem', firstSolvedAt: { $min: '$createdAt' } } },
      {
        $lookup: {
          from: 'problems',
          localField: '_id',
          foreignField: '_id',
          as: 'problem',
        },
      },
      { $unwind: '$problem' },
      { $project: { difficulty: '$problem.difficulty', firstSolvedAt: 1 } },
    ]),

    Problem.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),

    TestAttempt.find({ user: userId, status: { $in: ['submitted', 'expired'] } })
      .select('percentage passed submittedAt test')
      .populate('test', 'title slug')
      .sort({ submittedAt: -1 })
      .lean(),

    InterviewSession.find({ user: userId, status: 'completed' })
      .select('round overallScore completedAt')
      .sort({ completedAt: -1 })
      .lean(),

    computeStreak(userId),
  ]);

  const emptyByDifficulty = { easy: 0, medium: 0, hard: 0 };

  const solved = solvedDocs.reduce(
    (acc, item) => ({ ...acc, [item.difficulty]: (acc[item.difficulty] ?? 0) + 1 }),
    { ...emptyByDifficulty },
  );
  const available = availableCounts.reduce(
    (acc, item) => ({ ...acc, [item._id]: item.count }),
    { ...emptyByDifficulty },
  );

  const totalSolved = solvedDocs.length;
  const totalAvailable = Object.values(available).reduce((sum, n) => sum + n, 0);

  const testsTaken = attempts.length;
  const testAverage = testsTaken
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / testsTaken)
    : 0;

  const interviewAverage = interviews.length
    ? Math.round(interviews.reduce((sum, s) => sum + s.overallScore, 0) / interviews.length)
    : 0;

  const components = [
    { key: 'profile', label: 'Profile', value: profile?.completeness ?? 0 },
    {
      key: 'coding',
      label: 'Coding',
      value: totalAvailable ? Math.round((totalSolved / totalAvailable) * 100) : 0,
    },
    { key: 'tests', label: 'Tests', value: testAverage },
    { key: 'interview', label: 'Interview', value: interviewAverage },
  ];

  const readiness = Math.round(
    components.reduce((sum, part) => sum + part.value * WEIGHTS[part.key], 0),
  );

  // The lowest component is what the dashboard tells the student to fix.
  const weakest = [...components].sort((a, b) => a.value - b.value)[0];

  const activeInterview = await InterviewSession.findOne({ user: userId, status: 'in-progress' })
    .select('_id')
    .lean();

  const payload = {
    readiness: { score: readiness, components, weakest: weakest.key },
    coding: { solved, available, totalSolved, totalAvailable, streak },
    tests: {
      taken: testsTaken,
      passed: attempts.filter((a) => a.passed).length,
      average: testAverage,
      recent: attempts.slice(0, 3),
    },
    interviews: {
      completed: interviews.length,
      average: interviewAverage,
      recent: interviews.slice(0, 3),
      activeSessionId: activeInterview?._id ?? null,
    },
    skills: profile?.skills ?? [],
  };

  res.json({
    success: true,
    data: { ...payload, notifications: buildNotifications({ ...payload, profile }) },
  });
});
