import { Profile } from '../models/Profile.js';
import { Problem } from '../models/Problem.js';
import { SolvedProblem } from '../models/Submission.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { computeStreak } from '../services/streak.service.js';
import { buildNotifications } from '../services/notifications.service.js';
import { filterNotifications } from '../services/notificationPreferences.js';
import { scoreResume } from '../services/atsScore.js';
import { ROLE_PROFILES, roleByKey } from '../services/roleProfiles.js';
import { canonicalise } from '../services/skillTaxonomy.js';
import { buildRecommendations, buildTodayPlan } from '../services/todayPlan.js';
import { readHistory, recordSnapshot } from '../services/snapshot.service.js';
import { buildRoadmap } from '../services/roadmap.service.js';
import { buildAchievements } from '../services/achievements.js';
import { Application } from '../models/JobPosting.js';

/**
 * Readiness is the product's core number, so it is composed of the five
 * things a recruiter actually evaluates rather than whatever happened to be
 * easy to measure. Coding leads because it is the largest body of evidence.
 */
const WEIGHTS = { skills: 0.2, coding: 0.3, resume: 0.2, interview: 0.2, projects: 0.1 };

/** Compares the profile against a target role's expected skills. */
function matchRole(profile, roleKey) {
  const role = roleByKey(roleKey);
  if (!role) return null;

  const held = new Set(
    [
      ...(profile?.skills ?? []).map((skill) => canonicalise(skill.name)),
      ...(profile?.projects ?? []).flatMap((project) =>
        (project.techStack ?? []).map((tech) => canonicalise(tech)),
      ),
    ].filter(Boolean),
  );

  const verified = new Set(
    (profile?.skills ?? [])
      .filter((skill) => skill.verified)
      .map((skill) => canonicalise(skill.name)),
  );

  const check = (name) => ({ name, has: held.has(name), verified: verified.has(name) });

  const required = role.required.map(check);
  const preferred = role.preferred.map(check);

  // Required skills count double — a preferred gap is not the same problem.
  const earned = required.filter((s) => s.has).length * 2 + preferred.filter((s) => s.has).length;
  const possible = role.required.length * 2 + role.preferred.length;

  return {
    role: { key: role.key, label: role.label, icon: role.icon, codingTarget: role.codingTarget },
    score: possible ? Math.round((earned / possible) * 100) : 0,
    required,
    preferred,
    missing: [...required, ...preferred].filter((s) => !s.has).map((s) => s.name),
  };
}

export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, account, solvedByDifficulty, availableCounts, attempts, interviews, streak] =
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

      TestAttempt.find({ user: userId, status: { $in: ['submitted', 'expired'] } })
        .select('percentage passed submittedAt test')
        .populate('test', 'title slug')
        .sort({ submittedAt: -1 })
        .lean(),

      InterviewSession.find({ user: userId, status: 'completed' })
        .select('round overallScore dimensions completedAt')
        .sort({ completedAt: -1 })
        .lean(),

      computeStreak(userId),
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

  const atsReport = profile ? scoreResume({ profile, user: account }) : { score: 0, checks: [] };
  const roleMatch = matchRole(profile, profile?.targetRole);

  const skills = profile?.skills ?? [];
  const verifiedCount = skills.filter((skill) => skill.verified).length;

  // Skills are scored on verification, not on how many were typed in: a
  // self-declared list is a claim, a passed test is evidence.
  const skillsScore = roleMatch
    ? roleMatch.score
    : Math.min(100, skills.length * 10 + verifiedCount * 10);

  const codingTarget = roleMatch?.role.codingTarget ?? 60;
  const codingScore = Math.min(
    100,
    Math.round((totalSolved / Math.max(1, Math.min(codingTarget, totalAvailable || codingTarget))) * 100),
  );

  const projects = profile?.projects ?? [];
  const projectsScore = Math.min(
    100,
    projects.length * 30 + projects.filter((p) => (p.description ?? '').length > 60).length * 10,
  );

  const components = [
    { key: 'skills', label: 'Skills', value: skillsScore },
    { key: 'coding', label: 'Coding', value: codingScore },
    { key: 'resume', label: 'Resume', value: atsReport.score },
    { key: 'interview', label: 'Interview', value: interviewAverage },
    { key: 'projects', label: 'Projects', value: projectsScore },
  ];

  const readiness = Math.round(
    components.reduce((sum, part) => sum + part.value * WEIGHTS[part.key], 0),
  );

  const weakest = [...components].sort((a, b) => a.value - b.value)[0];

  const activeInterview = await InterviewSession.findOne({ user: userId, status: 'in-progress' })
    .select('_id')
    .lean();

  const payload = {
    student: { name: account?.name ?? 'there' },
    readiness: { score: readiness, components, weakest: weakest.key },
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
      TestAttempt.find({ user: userId, status: { $in: ['submitted', 'expired'] } })
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
      TestAttempt.countDocuments({ user: userId, status: { $in: ['submitted', 'expired'] } }),
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
