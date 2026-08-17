import { User } from '../models/User.js';
import { calculateProfileCompleteness, Profile } from '../models/Profile.js';
import { SolvedProblem } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';
import { Recruiter } from '../models/Recruiter.js';
import { Offer } from '../models/Offer.js';
import { analyseCohort } from '../services/cohortAnalytics.js';
import { buildPlacementInsight } from '../services/placementInsights.js';
import { aiStatus } from '../services/aiClient.js';
import { summariseFeedback } from '../services/recruiterInsights.js';
import { buildPlacementReport } from '../services/placementReport.js';
import { buildAlumniStats } from '../services/alumniStats.js';
import { Application } from '../models/JobPosting.js';

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

  const [profiles, solved, totalProblems, attempts, interviews, applications] = await Promise.all([
    Profile.find({ user: { $in: ids } })
      .select('user branch graduationYear headline completeness skills targetRoles')
      .lean(),

    // Same source as the student's own dashboard, so a staff member and a
    // student never see different solved counts.
    SolvedProblem.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),

    Problem.countDocuments({ isPublished: true }),

    TestAttempt.aggregate([
      {
        $match: {
          user: { $in: ids },
          status: { $in: ['submitted', 'expired', 'disqualified'] },
        },
      },
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

    Application.aggregate([
      { $match: { user: { $in: ids }, stage: { $ne: 'saved' } } },
      { $group: { _id: '$user', count: { $sum: 1 }, lastAt: { $max: '$updatedAt' } } },
    ]),
  ]);

  const profileBy = new Map(profiles.map((item) => [String(item.user), item]));
  const solvedBy = new Map(solved.map((item) => [String(item._id), item.count]));
  const testsBy = new Map(attempts.map((item) => [String(item._id), item]));
  const interviewBy = new Map(interviews.map((item) => [String(item._id), item]));
  const applicationsBy = new Map(applications.map((item) => [String(item._id), item]));

  let rows = students.map((student) => {
    const key = String(student._id);
    const profile = profileBy.get(key);
    const solvedCount = solvedBy.get(key) ?? 0;
    const test = testsBy.get(key);
    const interview = interviewBy.get(key);
    const application = applicationsBy.get(key);

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
      applications: application?.count ?? 0,
      lastApplicationAt: application?.lastAt ?? null,
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

  const [profile, attempts, interviews, recentSolves] = await Promise.all([
    Profile.findOne({ user: student._id }).lean(),
    TestAttempt.find({
      user: student._id,
      status: { $in: ['submitted', 'expired', 'disqualified'] },
    })
      .select('percentage passed submittedAt status test proctoring.warningCount proctoring.reason')
      .populate('test', 'title')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean(),
    InterviewSession.find({ user: student._id, status: 'completed' })
      .select('round overallScore verdict completedAt')
      .sort({ completedAt: -1 })
      .limit(10)
      .lean(),
    SolvedProblem.find({ user: student._id })
      .select('problem solvedAt')
      .populate('problem', 'title slug difficulty')
      .sort({ solvedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  res.json({
    success: true,
    data: { student, profile, attempts, interviews, recentSolves },
  });
});


/**
 * College-wide analytics and the training programmes they justify.
 *
 * Accepts the same filters as the student list so an officer can ask the
 * question of one department or graduating year rather than the whole
 * college.
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const { branch = '', graduationYear = '' } = req.query;

  const cohort = await loadCohort({ branch, graduationYear });

  res.json({ success: true, data: analyseCohort(cohort) });
});

/**
 * Cohort export.
 *
 * Placement offices live in spreadsheets, and a shortlist that cannot leave
 * the tool does not get used. CSV rather than XLSX so it opens anywhere.
 */
export const exportStudents = asyncHandler(async (req, res) => {
  const { branch = '', graduationYear = '', band = '', search = '' } = req.query;

  let rows = await loadCohort({ branch, graduationYear, search });
  if (band) rows = rows.filter((row) => row.band === band);

  const COLUMNS = [
    ['Name', (row) => row.name],
    ['Email', (row) => row.email],
    ['Branch', (row) => row.branch],
    ['Graduation', (row) => row.graduationYear ?? ''],
    ['Readiness', (row) => row.readiness],
    ['Band', (row) => row.band],
    ['Problems solved', (row) => row.solved],
    ['Tests taken', (row) => row.testsTaken],
    ['Test average', (row) => row.testAverage],
    ['Interviews', (row) => row.interviewsCompleted],
    ['Interview average', (row) => row.interviewAverage],
    ['Skills', (row) => row.skillCount],
    ['Verified skills', (row) => row.verifiedSkills],
    ['Verified skill names', (row) =>
      (row.profile?.skills ?? [])
        .filter((skill) => skill.verified)
        .map((skill) => skill.name)
        .join('; ')],
  ];

  // A field containing a comma, quote or newline has to be quoted, and inner
  // quotes doubled, or the spreadsheet silently mis-parses the row.
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = [
    COLUMNS.map(([header]) => header).join(','),
    ...rows.map((row) => COLUMNS.map(([, pick]) => escape(pick(row))).join(',')),
  ].join('\n');

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="students-${stamp}.csv"`);
  res.send(csv);
});

/**
 * A written reading of the placement position.
 *
 * Every figure behind this is computed by the same deterministic services
 * that draw the rest of the admin screens; the model only interprets and
 * prioritises them. Kept on its own endpoint so the Insights page renders
 * instantly from real numbers and the narrative arrives after, or not at
 * all — a slow or missing model must never delay the data.
 */
export const getPlacementInsight = asyncHandler(async (req, res) => {
  const { branch = '', graduationYear = '' } = req.query;

  const [cohort, recruiters, profiles, offers, studentCount] = await Promise.all([
    loadCohort({ branch, graduationYear }),
    Recruiter.find({}).select('name feedback').lean(),
    Profile.find({ graduationYear: { $ne: null } }).select('user graduationYear branch').lean(),
    Offer.find({}).select('student company status ctc').lean(),
    User.countDocuments({ role: 'student' }),
  ]);

  const analytics = analyseCohort(cohort);

  const { insight, error, findings } = await buildPlacementInsight({
    analytics,
    placement: buildPlacementReport({ totalStudents: studentCount, offers, profiles }),
    recruiters: summariseFeedback(recruiters),
    alumni: buildAlumniStats({ profiles, offers }),
  });

  res.json({
    success: true,
    data: {
      insight,
      error,
      // Returned either way, so the page still has something actionable
      // when the model is unavailable.
      findings,
      ai: aiStatus(),
    },
  });
});
