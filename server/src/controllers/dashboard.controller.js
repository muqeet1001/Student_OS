import { calculateProfileCompleteness, Profile } from '../models/Profile.js';
import { Problem } from '../models/Problem.js';
import { SolvedProblem } from '../models/Submission.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { computeStreak } from '../services/streak.service.js';
import { buildNotifications } from '../services/notifications.service.js';
import { filterNotifications } from '../services/notificationPreferences.js';
import { ROLE_PROFILES } from '../services/roleProfiles.js';
import { calculateReadinessEvidence, matchTargetRole as matchRole } from '../services/readiness.service.js';
import { scoreResume } from '../services/atsScore.js';
import { buildRecommendations, buildTodayPlan } from '../services/todayPlan.js';
import { readHistory, recordSnapshot } from '../services/snapshot.service.js';
import { buildRoadmap } from '../services/roadmap.service.js';
import { buildAchievements } from '../services/achievements.js';
import { Application } from '../models/JobPosting.js';
import { Submission } from '../models/Submission.js';
import { SkillAttempt } from '../models/SkillAssessment.js';
import { summarisePreparationActivity } from '../services/preparationActivity.js';
import { InstitutionConfig, StudentJourney } from '../models/StudentJourney.js';

/**
 * Readiness is the product's core number, so it is composed of the five
 * things a recruiter actually evaluates rather than whatever happened to be
 * easy to measure. Coding leads because it is the largest body of evidence.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, account, solvedByDifficulty, availableCounts, attempts, interviews, streak, institutionConfig] =
    await Promise.all([
      Profile.findOne({ user: userId }).lean(),
      User.findById(userId).select('name email').lean(),

      SolvedProblem.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),

      Problem.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),

      TestAttempt.find({
        user: userId,
        status: { $in: ['submitted', 'expired', 'disqualified'] },
      })
        .select('percentage passed submittedAt test')
        .populate('test', 'title slug')
        .sort({ submittedAt: -1 })
        .lean(),

      InterviewSession.find({ user: userId, status: 'completed' })
        .select('round overallScore dimensions completedAt')
        .sort({ completedAt: -1 })
        .lean(),

      computeStreak(userId),
      InstitutionConfig.findOne({ key: 'default' }).lean(),
    ]);

  const empty = { easy: 0, medium: 0, hard: 0 };
  const shape = (rows) => rows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), { ...empty });

  const solved = shape(solvedByDifficulty);
  const available = shape(availableCounts);
  const totalSolved = Object.values(solved).reduce((sum, n) => sum + n, 0);
  const totalAvailable = Object.values(available).reduce((sum, n) => sum + n, 0);

  const testAverage = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : 0;

  const interviewAverage = interviews.length
    ? Math.round(interviews.reduce((sum, s) => sum + s.overallScore, 0) / interviews.length)
    : 0;

  if (profile) profile.completeness = calculateProfileCompleteness(profile);
  const skills = profile?.skills ?? [];
  const projects = profile?.projects ?? [];
  const evidence = calculateReadinessEvidence({ profile, user: account, solvedCount: totalSolved, totalProblems: totalAvailable, interviewAverage, configuredWeights: institutionConfig?.readinessWeights });
  const { atsReport, codingDenominator, codingTarget, readiness, roleMatch, verifiedCount, weights } = evidence;

  const components = [
    {
      key: 'skills',
      label: 'Skills',
      value: evidence.values.skills,
      weight: weights.skills,
      basis: roleMatch
        ? `Match against ${roleMatch.role.label}; required skills count twice.`
        : `${skills.length} skills listed and ${verifiedCount} verified.`,
    },
    {
      key: 'coding',
      label: 'Coding',
      value: evidence.values.coding,
      weight: weights.coding,
      basis: `${totalSolved} problems solved toward a ${codingDenominator}-problem target.`,
    },
    {
      key: 'resume',
      label: 'Resume',
      value: evidence.values.resume,
      weight: weights.resume,
      basis: 'ATS checks across profile content, impact, completeness and formatting.',
    },
    {
      key: 'interview',
      label: 'Interview',
      value: evidence.values.interview,
      weight: weights.interview,
      basis: interviews.length
        ? `Average of ${interviews.length} completed mock interview${interviews.length === 1 ? '' : 's'}.`
        : 'No completed mock interview yet.',
    },
    {
      key: 'projects',
      label: 'Projects',
      value: evidence.values.projects,
      weight: weights.projects,
      basis: `${projects.length} project${projects.length === 1 ? '' : 's'}; detailed descriptions earn additional credit.`,
    },
  ];

  const weakest = [...components].sort((a, b) => a.value - b.value)[0];

  const activeInterview = await InterviewSession.findOne({ user: userId, status: 'in-progress' })
    .select('_id')
    .lean();

  const payload = {
    student: { name: account?.name ?? 'there' },
    readiness: {
      score: readiness,
      components,
      weakest: weakest.key,
      formulaVersion: '2026.1',
      lastUpdatedAt: new Date(),
      evidence: {
        skills: { listed: skills.length, verified: verifiedCount, role: roleMatch?.role?.label ?? null },
        coding: { solved: totalSolved, target: codingDenominator },
        resume: { checksPassed: atsReport.checks.filter((check) => check.passed).length, checksTotal: atsReport.checks.length },
        interview: { completed: interviews.length, average: interviewAverage },
        projects: { listed: projects.length, detailed: projects.filter((project) => (project.description ?? '').length > 60).length },
      },
    },
    coding: { solved, available, totalSolved, totalAvailable, target: codingTarget, streak },
    tests: {
      taken: attempts.length,
      passed: attempts.filter((a) => a.passed).length,
      average: testAverage,
      recent: attempts.slice(0, 3),
    },
    interviews: {
      completed: interviews.length,
      average: interviewAverage,
      latest: interviews[0] ?? null,
      recent: interviews.slice(0, 3),
      activeSessionId: activeInterview?._id ?? null,
    },
    resume: { atsScore: atsReport.score, checks: atsReport.checks },
    skills,
    projects: projects.length,
    targetRole: roleMatch,
    availableRoles: ROLE_PROFILES.map(({ key, label, icon }) => ({ key, label, icon })),
  };

  /*
   * Growth cannot be reconstructed later — the inputs only ever expose their
   * current value — so today's number is recorded on the way past. Awaited
   * but non-throwing: a failed write must never break the dashboard.
   */
  const applicationCount = await Application.countDocuments({ user: userId });
  await recordSnapshot(userId, {
    score: readiness,
    components,
    totals: {
      solved: totalSolved,
      verifiedSkills: verifiedCount,
      interviews: interviews.length,
      applications: applicationCount,
    },
  });

  // The first computed score after onboarding is frozen as the student's
  // baseline, so later progress has an honest starting point.
  await StudentJourney.updateOne(
    {
      user: userId,
      'onboarding.completedAt': { $ne: null },
      'onboarding.baseline.capturedAt': null,
    },
    {
      $set: {
        'onboarding.baseline.capturedAt': new Date(),
        'onboarding.baseline.score': readiness,
        'onboarding.baseline.components': Object.fromEntries(components.map((part) => [part.key, part.value])),
      },
    },
  ).catch(() => {});

  res.json({
    success: true,
    data: {
      ...payload,
      plan: buildTodayPlan({ ...payload, components, profile }),
      recommendations: buildRecommendations({ ...payload, components, atsReport, roleMatch }),
      // Filtered at derivation, in one place, so the badge count can never
      // disagree with the list under it.
      notifications: filterNotifications(
        buildNotifications({ ...payload, profile }),
        Object.fromEntries(req.user.settings?.notifications ?? []),
      ),
    },
  });
});

/** Readiness over time, for the progress chart. */
export const getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 90));
  const snapshots = await readHistory(req.user._id, days);

  const first = snapshots[0];
  const last = snapshots.at(-1);

  res.json({
    success: true,
    data: {
      snapshots,
      // A single data point is a reading, not a trend — say so rather than
      // drawing a flat line and implying no progress.
      trend:
        snapshots.length >= 2
          ? { change: last.score - first.score, from: first.day, to: last.day }
          : null,
    },
  });
});

/** A year of meaningful preparation work for the consistency heatmap. */
export const getActivity = asyncHandler(async (req, res) => {
  const days = Math.min(366, Math.max(30, Number(req.query.days) || 365));
  const since = new Date(Date.now() - days * 86_400_000);
  const user = req.user._id;

  const [submissions, tests, skillAttempts, interviews, applications] = await Promise.all([
    Submission.find({ user, verdict: 'accepted', createdAt: { $gte: since } })
      .select('createdAt')
      .lean(),
    TestAttempt.find({
      user,
      status: { $in: ['submitted', 'expired', 'disqualified'] },
      submittedAt: { $gte: since },
    })
      .select('submittedAt')
      .lean(),
    SkillAttempt.find({
      user,
      status: { $in: ['submitted', 'expired', 'disqualified'] },
      submittedAt: { $gte: since },
    })
      .select('submittedAt')
      .lean(),
    InterviewSession.find({ user, status: 'completed', completedAt: { $gte: since } })
      .select('completedAt')
      .lean(),
    Application.find({ user, stage: { $ne: 'saved' }, appliedAt: { $gte: since } })
      .select('appliedAt')
      .lean(),
  ]);

  const events = [
    ...submissions.map((item) => ({ type: 'coding', at: item.createdAt })),
    ...tests.map((item) => ({ type: 'assessments', at: item.submittedAt })),
    ...skillAttempts.map((item) => ({ type: 'assessments', at: item.submittedAt })),
    ...interviews.map((item) => ({ type: 'interviews', at: item.completedAt })),
    ...applications.map((item) => ({ type: 'applications', at: item.appliedAt })),
  ];

  res.json({ success: true, data: summarisePreparationActivity(events) });
});

/** Sets the student's target role, which re-frames every readiness number. */
export const setTargetRole = asyncHandler(async (req, res) => {
  const { targetRole } = req.body;

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { targetRole },
    { new: true },
  ).lean();

  res.json({ success: true, data: { targetRole: matchRole(profile, targetRole) } });
});


/**
 * Badges and level.
 *
 * Derived on read from the same evidence the dashboard uses, so a badge can
 * never disagree with the number it claims to be counting.
 */
export const getAchievements = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, account, solvedByDifficulty, attempts, interviews, applications, streak] =
    await Promise.all([
      Profile.findOne({ user: userId }).lean(),
      User.findById(userId).select('name email').lean(),
      SolvedProblem.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      TestAttempt.find({
        user: userId,
        status: { $in: ['submitted', 'expired', 'disqualified'] },
      })
        .select('passed')
        .lean(),
      InterviewSession.find({ user: userId, status: 'completed' }).select('overallScore').lean(),
      Application.countDocuments({ user: userId, stage: { $ne: 'saved' } }),
      computeStreak(userId),
    ]);

  const solved = solvedByDifficulty.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {
    easy: 0,
    medium: 0,
    hard: 0,
  });

  const atsReport = profile ? scoreResume({ profile, user: account }) : { score: 0 };

  const achievements = buildAchievements({
    solved: { ...solved, total: solved.easy + solved.medium + solved.hard },
    streak,
    verifiedSkills: (profile?.skills ?? []).filter((skill) => skill.verified).length,
    testsPassed: attempts.filter((attempt) => attempt.passed).length,
    interviewsCompleted: interviews.length,
    bestInterviewScore: interviews.reduce((best, s) => Math.max(best, s.overallScore ?? 0), 0),
    projects: (profile?.projects ?? []).length,
    certifications: (profile?.certifications ?? []).length,
    atsScore: atsReport.score,
    applications,
  });

  res.json({ success: true, data: achievements });
});

/**
 * The four-week plan.
 *
 * Rebuilt from live state on every request rather than stored: a stored
 * roadmap goes stale the moment a student verifies a skill, and would then
 * be telling them to do something they have already done.
 */
export const getRoadmap = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, account, solvedByDifficulty, attempts, interviews, applications] =
    await Promise.all([
      Profile.findOne({ user: userId }).lean(),
      User.findById(userId).select('name email').lean(),
      SolvedProblem.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      TestAttempt.countDocuments({
        user: userId,
        status: { $in: ['submitted', 'expired', 'disqualified'] },
      }),
      InterviewSession.find({ user: userId, status: 'completed' }).select('overallScore').lean(),
      Application.countDocuments({ user: userId, stage: { $ne: 'saved' } }),
    ]);

  const empty = { easy: 0, medium: 0, hard: 0 };
  const solved = solvedByDifficulty.reduce(
    (acc, row) => ({ ...acc, [row._id]: row.count }),
    { ...empty },
  );
  const totalSolved = Object.values(solved).reduce((sum, n) => sum + n, 0);

  const interviewAverage = interviews.length
    ? Math.round(interviews.reduce((sum, s) => sum + s.overallScore, 0) / interviews.length)
    : 0;

  const atsReport = profile ? scoreResume({ profile, user: account }) : { score: 0, checks: [] };
  const roleMatch = matchRole(profile, profile?.targetRole);

  const components = [
    { key: 'interview', label: 'Interview', value: interviewAverage },
  ];

  const roadmap = buildRoadmap({
    components,
    coding: { solved, totalSolved },
    tests: { taken: attempts },
    interviews: { completed: interviews.length },
    resume: { atsScore: atsReport.score, checks: atsReport.checks },
    profile,
    roleMatch,
  });

  // The applying task is the one signal the dashboard payload cannot supply.
  for (const week of roadmap.weeks) {
    for (const task of week.tasks) {
      if (task.derivedFrom === 'applications') {
        task.done = applications > 0;
        task.progress = `${applications} applied`;
      }
    }
    week.done = week.tasks.filter((task) => task.done).length;
    week.complete = week.tasks.every((task) => task.done);
  }

  const all = roadmap.weeks.flatMap((week) => week.tasks);
  roadmap.progress = {
    done: all.filter((task) => task.done).length,
    total: all.length,
    percentage: Math.round((all.filter((task) => task.done).length / all.length) * 100),
  };

  res.json({ success: true, data: { ...roadmap, targetRole: roleMatch } });
});
