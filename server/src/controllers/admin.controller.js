import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Submission } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const WEIGHTS = { profile: 0.2, coding: 0.35, tests: 0.25, interview: 0.2 };

/** Buckets used by both the filter and the cohort summary. */
const BANDS = [
  { key: 'ready', label: 'Ready', min: 75 },
  { key: 'progressing', label: 'Progressing', min: 45 },
  { key: 'at-risk', label: 'At risk', min: 0 },
];

const bandFor = (score) => BANDS.find((band) => score >= band.min).key;

/**
 * Cohort view for placement staff.
 *
 * Readiness is aggregated per student in the database rather than by loading
 * every student's submissions into memory, so the page stays usable for a
 * whole graduating year rather than a demo-sized cohort.
 */
export const listStudents = asyncHandler(async (req, res) => {
  const {
    search = '',
    branch = '',
    graduationYear = '',
    band = '',
    sort = 'readiness',
    page = 1,
    limit = 25,
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 25));

  const userFilter = { role: 'student' };
  if (search) {
    userFilter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const profileFilter = {};
  if (branch) profileFilter.branch = branch;
  if (graduationYear) profileFilter.graduationYear = Number(graduationYear);

  // Narrow by profile first when a profile filter is active, so the user
  // query only touches students who can still match.
  let userIds = null;
  if (Object.keys(profileFilter).length > 0) {
    const profiles = await Profile.find(profileFilter).select('user').lean();
    userIds = profiles.map((profile) => profile.user);
    userFilter._id = { $in: userIds };
  }

  const students = await User.find(userFilter).select('name email createdAt').lean();
  const ids = students.map((student) => student._id);

  const [profiles, solved, totalProblems, attempts, interviews] = await Promise.all([
    Profile.find({ user: { $in: ids } })
      .select('user branch graduationYear headline completeness skills targetRoles')
      .lean(),

    Submission.aggregate([
      { $match: { user: { $in: ids }, verdict: 'accepted' } },
      { $group: { _id: { user: '$user', problem: '$problem' } } },
      { $group: { _id: '$_id.user', count: { $sum: 1 }, } },
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

  let rows = students.map((student) => {
    const key = String(student._id);
    const profile = profileBy.get(key);
    const solvedCount = solvedBy.get(key) ?? 0;
    const test = testsBy.get(key);
    const interview = interviewBy.get(key);

    const components = {
      profile: profile?.completeness ?? 0,
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
      branch: profile?.branch ?? '',
      graduationYear: profile?.graduationYear ?? null,
      headline: profile?.headline ?? '',
      targetRoles: profile?.targetRoles ?? [],
      skillCount: profile?.skills?.length ?? 0,
      verifiedSkills: profile?.skills?.filter((skill) => skill.verified).length ?? 0,
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

  if (band) rows = rows.filter((row) => row.band === band);

  const sorters = {
    readiness: (a, b) => b.readiness - a.readiness,
    'readiness-asc': (a, b) => a.readiness - b.readiness,
    name: (a, b) => a.name.localeCompare(b.name),
    solved: (a, b) => b.solved - a.solved,
  };
  rows.sort(sorters[sort] ?? sorters.readiness);

  const total = rows.length;

  res.json({
    success: true,
    data: {
      students: rows.slice((pageNum - 1) * perPage, pageNum * perPage),
      pagination: { page: pageNum, limit: perPage, total, pages: Math.ceil(total / perPage) || 1 },
      summary: {
        total,
        averageReadiness: total
          ? Math.round(rows.reduce((sum, row) => sum + row.readiness, 0) / total)
          : 0,
        bands: BANDS.map((bandDef) => ({
          ...bandDef,
          count: rows.filter((row) => row.band === bandDef.key).length,
        })),
      },
    },
  });
});

/** Distinct values for the filter controls, so they only offer real options. */
export const getFilters = asyncHandler(async (_req, res) => {
  const [branches, years] = await Promise.all([
    Profile.distinct('branch', { branch: { $nin: ['', null] } }),
    Profile.distinct('graduationYear', { graduationYear: { $ne: null } }),
  ]);

  res.json({
    success: true,
    data: {
      branches: branches.sort(),
      graduationYears: years.sort((a, b) => a - b),
      bands: BANDS,
    },
  });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.studentId, role: 'student' })
    .select('name email createdAt')
    .lean();

  if (!student) throw new ApiError(404, 'Student not found.');

  const [profile, attempts, interviews, recentSubmissions] = await Promise.all([
    Profile.findOne({ user: student._id }).lean(),
    TestAttempt.find({ user: student._id, status: { $in: ['submitted', 'expired'] } })
      .select('percentage passed submittedAt test')
      .populate('test', 'title')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean(),
    InterviewSession.find({ user: student._id, status: 'completed' })
      .select('round overallScore verdict completedAt')
      .sort({ completedAt: -1 })
      .limit(10)
      .lean(),
    Submission.find({ user: student._id, verdict: 'accepted' })
      .select('problem createdAt')
      .populate('problem', 'title slug difficulty')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  res.json({
    success: true,
    data: { student, profile, attempts, interviews, recentSubmissions },
  });
});
