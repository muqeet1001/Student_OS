import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
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
import { ActionItem, InstitutionConfig, MentorAppointment } from '../models/StudentJourney.js';
import { calculateReadinessEvidence } from '../services/readiness.service.js';
import { Drive } from '../models/Drive.js';
import { ReviewRequest } from '../models/ReviewRequest.js';
import { Training } from '../models/Training.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { rankStudents } from '../services/jobMatch.js';
import { SavedCohortView } from '../models/SavedCohortView.js';
import { recordAudit } from '../services/audit.service.js';
import { Resume } from '../models/Resume.js';
import { StudentDocument } from '../models/Document.js';

/** Buckets used by both the filter and the cohort summary. */
const BANDS = [
  { key: 'ready', label: 'Ready', min: 75 },
  { key: 'progressing', label: 'Progressing', min: 45 },
  { key: 'at-risk', label: 'At risk', min: 0 },
];

const bandFor = (score) => BANDS.find((band) => score >= band.min).key;

function profileCgpa(profile) {
  if (profile?.cgpa != null) return Number(profile.cgpa);
  const grade = profile?.education?.find((entry) => /\d/.test(String(entry.grade ?? '')))?.grade;
  const match = String(grade ?? '').match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return value > 10 ? value / 10 : value;
}

/**
 * The placement officer's operational home. This endpoint deliberately
 * answers "what needs attention" rather than returning another analytics
 * dashboard. Every list is scoped to one graduating batch.
 */
export const getOverview = asyncHandler(async (req, res) => {
  const config = await InstitutionConfig.findOne({ key: 'default' }).lean();
  const availableYears = (await Profile.distinct('graduationYear', { graduationYear: { $ne: null } }))
    .sort((a, b) => b - a);
  const requestedYear = Number(req.query.graduationYear) || null;
  const activeYear = requestedYear || config?.activeGraduationYear || availableYears[0] || new Date().getFullYear();
  const cohort = await loadCohort({ graduationYear: activeYear });
  const studentIds = cohort.map((student) => student._id);
  const now = new Date();
  const inFourteenDays = new Date(now.getTime() + 14 * 86_400_000);

  const [applicationRows, offers, actions, reviews, mentoring, drives, recruiters, training, totalCompanies] = await Promise.all([
    Application.aggregate([
      { $match: { user: { $in: studentIds }, stage: { $ne: 'saved' } } },
      { $group: { _id: '$user', count: { $sum: 1 }, lastAt: { $max: '$updatedAt' } } },
    ]),
    Offer.find({ student: { $in: studentIds } }).select('student company role status offeredAt ctc').lean(),
    ActionItem.find({ source: 'staff', owner: { $in: studentIds }, status: 'todo' })
      .populate('owner', 'name email')
      .populate('staffOwner', 'name')
      .sort({ priority: -1, dueAt: 1 })
      .limit(12)
      .lean(),
    ReviewRequest.find({ student: { $in: studentIds }, status: 'requested' })
      .populate('student', 'name email')
      .sort({ createdAt: 1 })
      .limit(8)
      .lean(),
    MentorAppointment.find({ student: { $in: studentIds }, status: 'requested' })
      .populate('student', 'name email')
      .sort({ createdAt: 1 })
      .limit(8)
      .lean(),
    Drive.find({ status: { $in: ['planned', 'open', 'in-progress'] } })
      .select('company role status driveDate applicationDeadline nextAction nextActionDueAt shortlist requirements minReadiness')
      .sort({ applicationDeadline: 1, driveDate: 1 })
      .limit(12)
      .lean(),
    Recruiter.find({
      status: { $in: ['prospect', 'active', 'dormant'] },
      nextFollowUpAt: { $ne: null, $lte: inFourteenDays },
    })
      .select('name status nextAction nextFollowUpAt contacts ownedBy')
      .sort({ nextFollowUpAt: 1 })
      .limit(8)
      .lean({ virtuals: true }),
    Training.find({ status: { $in: ['planned', 'running'] }, startsAt: { $gte: now } })
      .select('title startsAt venue status attendance targetComponent')
      .sort({ startsAt: 1 })
      .limit(6)
      .lean(),
    Recruiter.countDocuments(),
  ]);

  const applicationsBy = new Map(applicationRows.map((row) => [String(row._id), row]));
  const placedIds = new Set(
    offers
      .filter((offer) => ['accepted', 'joined'].includes(offer.status))
      .map((offer) => String(offer.student)),
  );

  const interventionCases = cohort
    .filter((student) => !placedIds.has(String(student._id)))
    .map((student) => {
      const application = applicationsBy.get(String(student._id));
      const signals = [];
      if (!application?.count) signals.push({ key: 'no-applications', label: 'No applications', severity: 'high' });
      if (student.components.resume < 60) signals.push({ key: 'resume', label: 'Resume evidence incomplete', severity: 'high' });
      if (student.testsTaken >= 2 && student.testsPassed === 0) signals.push({ key: 'assessment', label: 'Repeated assessment difficulty', severity: 'urgent' });
      if (student.interviewsCompleted === 0 && student.readiness >= 45) signals.push({ key: 'interview', label: 'No interview practice', severity: 'medium' });
      if (student.verifiedSkills === 0 && student.skillCount > 0) signals.push({ key: 'verification', label: 'Skills not verified', severity: 'medium' });
      return { ...student, applications: application?.count ?? 0, lastApplicationAt: application?.lastAt ?? null, signals };
    })
    .filter((student) => student.signals.length)
    .sort((a, b) => b.signals.length - a.signals.length || a.readiness - b.readiness);

  const overdueActions = actions.filter((action) => action.dueAt && new Date(action.dueAt) < now).length;
  const eligibleIds = new Set();
  for (const drive of drives) {
    const ranked = rankStudents(cohort, drive.requirements, { limit: cohort.length });
    for (const student of ranked) {
      if (student.match.blockers.length === 0 && student.readiness >= (drive.minReadiness ?? 0)) {
        eligibleIds.add(String(student._id));
      }
    }
  }
  const packages = offers.map((offer) => offer.ctc).filter((ctc) => Number.isFinite(ctc) && ctc > 0);
  const drivesNeedingAction = drives.filter((drive) => {
    const due = drive.nextActionDueAt || drive.applicationDeadline || drive.driveDate;
    return !drive.nextAction || (due && new Date(due) <= inFourteenDays);
  });

  res.json({
    success: true,
    data: {
      scope: {
        activeGraduationYear: activeYear,
        placementSeasonName: config?.placementSeasonName || `Class of ${activeYear}`,
        availableYears,
      },
      summary: {
        students: cohort.length,
        eligible: eligibleIds.size,
        placed: placedIds.size,
        placementRate: cohort.length ? Math.round((placedIds.size / cohort.length) * 100) : 0,
        ready: cohort.filter((student) => student.band === 'ready').length,
        companies: totalCompanies,
        offers: offers.length,
        averagePackage: packages.length
          ? Math.round(packages.reduce((sum, ctc) => sum + ctc, 0) / packages.length)
          : 0,
        interventionCases: interventionCases.length,
        openDrives: drives.length,
        overdueActions,
        pendingReviews: reviews.length,
      },
      actions,
      interventionCases: interventionCases.slice(0, 10),
      reviews,
      mentoring,
      drives: drivesNeedingAction.slice(0, 8).map((drive) => ({
        ...drive,
        shortlistCount: drive.shortlist.length,
        selectedCount: drive.shortlist.filter((entry) => entry.stage === 'selected').length,
      })),
      recruiterFollowUps: recruiters,
      training,
    },
  });
});

export const getStaff = asyncHandler(async (_req, res) => {
  const staff = await User.find({ role: 'admin' }).select('name email avatarUrl').sort({ name: 1 }).lean();
  res.json({ success: true, data: { staff } });
});

export const getActivity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.entityType) filter.entityType = req.query.entityType;
  const events = await AuditEvent.find(filter)
    .populate('actor', 'name email')
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Math.max(1, Number(req.query.limit) || 80)))
    .lean();
  res.json({ success: true, data: { events } });
});

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
    minCgpa = '',
    minReadiness = '',
    minCoding = '',
    minAts = '',
    minInterview = '',
    minVerifiedSkills = '',
    skill = '',
    hasProjects = '',
    hasCertifications = '',
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

  const [profiles, solved, totalProblems, attempts, interviews, applications, institutionConfig] = await Promise.all([
    Profile.find({ user: { $in: ids } })
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
    InstitutionConfig.findOne({ key: 'default' }).lean(),
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

    const evidence = calculateReadinessEvidence({
      profile,
      user: student,
      solvedCount,
      totalProblems,
      interviewAverage: interview?.average,
      configuredWeights: institutionConfig?.readinessWeights,
    });
    const components = evidence.values;
    const readiness = evidence.readiness;

    return {
      _id: student._id,
      name: student.name,
      email: student.email,
      joinedAt: student.createdAt,
      branch: profile?.branch ?? '',
      graduationYear: profile?.graduationYear ?? null,
      cgpa: profileCgpa(profile),
      headline: profile?.headline ?? '',
      targetRoles: profile?.targetRoles ?? [],
      skillCount: profile?.skills?.length ?? 0,
      verifiedSkills: profile?.skills?.filter((skill) => skill.verified).length ?? 0,
      verifiedSkillNames: profile?.skills?.filter((item) => item.verified).map((item) => item.name) ?? [],
      projectCount: profile?.projects?.length ?? 0,
      certificationCount: profile?.certifications?.length ?? 0,
      profileUpdatedAt: profile?.updatedAt ?? null,
      solved: solvedCount,
      testsTaken: test?.taken ?? 0,
      testsPassed: test?.passed ?? 0,
      testAverage: Math.round(test?.average ?? 0),
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
  if (minCgpa !== '') rows = rows.filter((row) => row.cgpa != null && row.cgpa >= Number(minCgpa));
  if (minReadiness !== '') rows = rows.filter((row) => row.readiness >= Number(minReadiness));
  if (minCoding !== '') rows = rows.filter((row) => row.components.coding >= Number(minCoding));
  if (minAts !== '') rows = rows.filter((row) => row.components.resume >= Number(minAts));
  if (minInterview !== '') rows = rows.filter((row) => row.interviewAverage >= Number(minInterview));
  if (minVerifiedSkills !== '') rows = rows.filter((row) => row.verifiedSkills >= Number(minVerifiedSkills));
  if (skill) rows = rows.filter((row) => row.verifiedSkillNames.some((name) => name.toLowerCase().includes(skill.toLowerCase())));
  if (hasProjects === 'true') rows = rows.filter((row) => row.projectCount > 0);
  if (hasCertifications === 'true') rows = rows.filter((row) => row.certificationCount > 0);

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

export const listSavedCohortViews = asyncHandler(async (req, res) => {
  const views = await SavedCohortView.find({ owner: req.user._id }).sort({ updatedAt: -1 }).lean();
  res.json({ success: true, data: { views } });
});

export const createSavedCohortView = asyncHandler(async (req, res) => {
  const view = await SavedCohortView.findOneAndUpdate(
    { owner: req.user._id, name: req.body.name },
    { ...req.body, owner: req.user._id },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await recordAudit({ actor: req.user._id, action: 'cohort-view.saved', entityType: 'cohort-view', entityId: view._id, summary: `Saved ${view.kind} “${view.name}”`, metadata: { studentCount: view.students.length } });
  res.status(201).json({ success: true, data: { view } });
});

export const deleteSavedCohortView = asyncHandler(async (req, res) => {
  const view = await SavedCohortView.findOneAndDelete({ _id: req.params.viewId, owner: req.user._id });
  if (!view) throw new ApiError(404, 'Saved view not found.');
  res.json({ success: true, data: { message: 'Saved view deleted.' } });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.studentId, role: 'student' })
    .select('name email createdAt')
    .lean();

  if (!student) throw new ApiError(404, 'Student not found.');

  const [profile, attempts, interviews, recentSolves, applications, resumes, documents, offers, actions, drives] = await Promise.all([
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
    Application.find({ user: student._id, stage: { $ne: 'saved' } })
      .populate('job', 'title company location')
      .sort({ updatedAt: -1 })
      .lean(),
    Resume.find({ user: student._id }).select('title targetRole targetCompany atsScore updatedAt').sort({ updatedAt: -1 }).lean(),
    StudentDocument.find({ owner: student._id }).select('kind title status expiresAt reviewedAt createdAt').sort({ createdAt: -1 }).lean(),
    Offer.find({ student: student._id }).select('company role ctc status offeredAt joiningDate').sort({ offeredAt: -1 }).lean(),
    ActionItem.find({ owner: student._id }).populate('staffOwner assignedBy', 'name').sort({ createdAt: -1 }).limit(20).lean(),
    Drive.find({ 'shortlist.student': student._id })
      .select('company role status shortlist driveDate')
      .sort({ driveDate: -1 })
      .lean(),
  ]);

  const pipeline = drives.map((drive) => ({
    _id: drive._id,
    company: drive.company,
    role: drive.role,
    status: drive.status,
    driveDate: drive.driveDate,
    candidate: drive.shortlist.find((entry) => String(entry.student) === String(student._id)),
  }));

  res.json({
    success: true,
    data: { student, profile, attempts, interviews, recentSolves, applications, resumes, documents, offers, actions, pipeline },
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
