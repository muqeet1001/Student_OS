/**
 * Loads a cohort with every readiness signal attached.
 *
 * Shared by the admin list and the job matcher so both reason about exactly
 * the same numbers, and so the aggregation lives in one place rather than
 * being rewritten per endpoint.
 */
import { User } from '../models/User.js';
import { calculateProfileCompleteness, Profile } from '../models/Profile.js';
import { Problem } from '../models/Problem.js';
import { SolvedProblem } from '../models/Submission.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';

export const WEIGHTS = { profile: 0.2, coding: 0.35, tests: 0.25, interview: 0.2 };

export const BANDS = [
  { key: 'ready', label: 'Ready', min: 75 },
  { key: 'progressing', label: 'Progressing', min: 45 },
  { key: 'at-risk', label: 'At risk', min: 0 },
];

export const bandFor = (score) => BANDS.find((band) => score >= band.min).key;

/**
 * @param {object} [filters] `{ search, branch, graduationYear }`
 * @returns {Promise<Array>} One row per student, with `profile` attached.
 */
export async function loadCohort({ search = '', branch = '', graduationYear = '' } = {}) {
  const userFilter = { role: 'student' };

  if (search) {
    userFilter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  }

  const profileFilter = {};
  if (branch) profileFilter.branch = branch;
  if (graduationYear) profileFilter.graduationYear = Number(graduationYear);

  // Narrowing by profile first keeps the user query to students who can
  // still match.
  if (Object.keys(profileFilter).length > 0) {
    const narrowed = await Profile.find(profileFilter).select('user').lean();
    userFilter._id = { $in: narrowed.map((item) => item.user) };
  }

  const students = await User.find(userFilter).select('name email createdAt').lean();
  const ids = students.map((student) => student._id);

  if (ids.length === 0) return [];

  const [profiles, solved, totalProblems, attempts, interviews] = await Promise.all([
    Profile.find({ user: { $in: ids } }).lean(),

    SolvedProblem.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),

    Problem.countDocuments({ isPublished: true }),

    TestAttempt.aggregate([
      { $match: { user: { $in: ids }, status: { $in: ['submitted', 'expired'] } } },
      {
        $group: {
          _id: '$user',
          taken: { $sum: 1 },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
          average: { $avg: '$percentage' },
          lastAt: { $max: '$submittedAt' },
        },
      },
    ]),

    InterviewSession.aggregate([
      { $match: { user: { $in: ids }, status: 'completed' } },
      { $group: { _id: '$user', completed: { $sum: 1 }, average: { $avg: '$overallScore' } } },
    ]),
  ]);

  const profileBy = new Map(profiles.map((item) => [String(item.user), item]));
  const solvedBy = new Map(solved.map((item) => [String(item._id), item.count]));
  const testsBy = new Map(attempts.map((item) => [String(item._id), item]));
  const interviewBy = new Map(interviews.map((item) => [String(item._id), item]));

  return students.map((student) => {
    const key = String(student._id);
    const profile = profileBy.get(key) ?? {};
    const solvedCount = solvedBy.get(key) ?? 0;
    const test = testsBy.get(key);
    const interview = interviewBy.get(key);

    const components = {
      profile: calculateProfileCompleteness(profile),
      coding: totalProblems ? Math.round((solvedCount / totalProblems) * 100) : 0,
      tests: Math.round(test?.average ?? 0),
      interview: Math.round(interview?.average ?? 0),
    };

    const readiness = Math.round(
      Object.entries(components).reduce((sum, [key2, value]) => sum + value * WEIGHTS[key2], 0),
    );

    return {
      _id: student._id,
      name: student.name,
      email: student.email,
      joinedAt: student.createdAt,
      profile,
      branch: profile.branch ?? '',
      graduationYear: profile.graduationYear ?? null,
      headline: profile.headline ?? '',
      targetRoles: profile.targetRoles ?? [],
      skillCount: profile.skills?.length ?? 0,
      verifiedSkills: profile.skills?.filter((skill) => skill.verified).length ?? 0,
      solved: solvedCount,
      testsTaken: test?.taken ?? 0,
      testsPassed: test?.passed ?? 0,
      testAverage: components.tests,
      interviewsCompleted: interview?.completed ?? 0,
      interviewAverage: components.interview,
      lastActiveAt: test?.lastAt ?? null,
      components,
      readiness,
      band: bandFor(readiness),
    };
  });
}
