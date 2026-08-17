import { SkillAssessment, SkillAttempt } from '../models/SkillAssessment.js';
import { Profile } from '../models/Profile.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canonicalise } from '../services/skillTaxonomy.js';
import { recordProctoringViolation } from '../services/proctoring.js';

/** Retake window. Long enough that a retest means study, not memorisation. */
const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/** Grace for latency, so a submit sent just before time is still accepted. */
const SUBMIT_GRACE_MS = 5000;

/** Shape sent while an attempt is running — never says which option is right. */
const maskQuestion = (question) => ({
  _id: question._id,
  prompt: question.prompt,
  tier: question.tier,
  options: question.options.map((option) => ({ _id: option._id, text: option.text })),
});

function levelFor(percentage, thresholds) {
  if (percentage >= thresholds.advanced) return 'advanced';
  if (percentage >= thresholds.intermediate) return 'intermediate';
  return 'beginner';
}

/** Every assessment, annotated with this student's status and cooldown. */
export const listAssessments = asyncHandler(async (req, res) => {
  const [assessments, attempts, profile] = await Promise.all([
    SkillAssessment.find({ active: true }).select('-questions').sort({ skill: 1 }).lean(),
    SkillAttempt.find({ user: req.user._id, status: { $in: ['submitted', 'disqualified'] } })
      .select('skill percentage level status submittedAt proctoring.reason')
      .sort({ submittedAt: -1 })
      .lean(),
    Profile.findOne({ user: req.user._id }).select('skills').lean(),
  ]);

  const latestBySkill = new Map();
  const mostRecentBySkill = new Map();
  for (const attempt of attempts) {
    if (!mostRecentBySkill.has(attempt.skill)) mostRecentBySkill.set(attempt.skill, attempt);
    if (attempt.status === 'submitted' && !latestBySkill.has(attempt.skill)) {
      latestBySkill.set(attempt.skill, attempt);
    }
  }

  const declared = new Set((profile?.skills ?? []).map((skill) => canonicalise(skill.name)));

  res.json({
    success: true,
    data: {
      assessments: assessments.map((assessment) => {
        const latest = latestBySkill.get(assessment.skill) ?? null;
        const mostRecent = mostRecentBySkill.get(assessment.skill) ?? null;
        const since = mostRecent
          ? Date.now() - new Date(mostRecent.submittedAt).getTime()
          : Infinity;
        const cooldownRemaining = Math.max(0, COOLDOWN_MS - since);

        return {
          ...assessment,
          questionCount: assessment.questionCount ?? undefined,
          latest,
          declared: declared.has(assessment.skill),
          cooldownDays: cooldownRemaining ? Math.ceil(cooldownRemaining / 86_400_000) : 0,
          canAttempt: cooldownRemaining === 0,
        };
      }),
      history: attempts,
    },
  });
});

/** Starts (or resumes) an attempt. */
export const startAttempt = asyncHandler(async (req, res) => {
  const skill = canonicalise(req.params.skill);

  const assessment = await SkillAssessment.findOne({ skill, active: true });
  if (!assessment) throw new ApiError(404, 'No assessment exists for that skill yet.');
  if (assessment.questions.length === 0) {
    throw new ApiError(409, 'That assessment has no questions yet.');
  }

  // Resuming returns the same questions, so a refresh cannot reroll the test.
  const open = await SkillAttempt.findOne({
    user: req.user._id,
    assessment: assessment._id,
    status: 'in-progress',
    expiresAt: { $gt: new Date() },
  });

  if (open) {
    return res.json({
      success: true,
      data: {
        attemptId: open._id,
        skill: assessment.skill,
        durationMinutes: assessment.durationMinutes,
        expiresAt: open.expiresAt,
        proctoring: { warningCount: open.proctoring?.warningCount ?? 0 },
        questions: assessment.questions.map(maskQuestion),
      },
    });
  }

  const last = await SkillAttempt.findOne({
    user: req.user._id,
    skill,
    status: { $in: ['submitted', 'disqualified'] },
  })
    .sort({ submittedAt: -1 })
    .lean();

  if (last) {
    const since = Date.now() - new Date(last.submittedAt).getTime();
    if (since < COOLDOWN_MS) {
      throw new ApiError(
        429,
        `You can retake ${skill} in ${Math.ceil((COOLDOWN_MS - since) / 86_400_000)} days.`,
      );
    }
  }

  // The deadline is set here, server-side, so the clock cannot be extended
  // by tampering with the client.
  const attempt = await SkillAttempt.create({
    user: req.user._id,
    assessment: assessment._id,
    skill: assessment.skill,
    total: assessment.questions.length,
    expiresAt: new Date(Date.now() + assessment.durationMinutes * 60 * 1000),
  });

  return res.status(201).json({
    success: true,
    data: {
      attemptId: attempt._id,
      skill: assessment.skill,
      durationMinutes: assessment.durationMinutes,
      expiresAt: attempt.expiresAt,
      proctoring: { warningCount: 0 },
      questions: assessment.questions.map(maskQuestion),
    },
  });
});

/**
 * Scores the attempt and writes the verified level onto the profile — the
 * step that turns a claim into evidence.
 */
export const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await SkillAttempt.findOne({
    _id: req.params.attemptId,
    user: req.user._id,
  });

  if (!attempt) throw new ApiError(404, 'Attempt not found.');
  if (attempt.status === 'disqualified') {
    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: 0,
        total: attempt.total,
        percentage: 0,
        level: 'beginner',
        expired: false,
        verified: false,
        disqualified: true,
        proctoringReason: attempt.proctoring?.reason,
        review: [],
      },
    });
  }
  if (attempt.status !== 'in-progress') throw new ApiError(409, 'This attempt is already finished.');

  const assessment = await SkillAssessment.findById(attempt.assessment);
  if (!assessment) throw new ApiError(404, 'Assessment not found.');

  const expired = Date.now() > attempt.expiresAt.getTime() + SUBMIT_GRACE_MS;
  const submitted = new Map(
    (req.body.answers ?? []).map((answer) => [String(answer.question), String(answer.selectedOption)]),
  );

  let score = 0;
  const answers = assessment.questions.map((question) => {
    const chosen = submitted.get(String(question._id)) ?? null;
    const correct = question.options.find((option) => option.isCorrect);
    const isCorrect = Boolean(chosen) && String(correct._id) === chosen;
    if (isCorrect) score += 1;

    return { question: question._id, selectedOption: chosen, isCorrect };
  });

  const total = assessment.questions.length;
  const percentage = total ? Math.round((score / total) * 100) : 0;
  const level = levelFor(percentage, assessment.thresholds);

  Object.assign(attempt, {
    answers,
    score,
    total,
    percentage,
    level,
    status: expired ? 'expired' : 'submitted',
    submittedAt: new Date(),
  });
  await attempt.save();

  // Write the result onto the profile: add the skill if it is new, and only
  // ever raise a verified level, never lower one the student already earned.
  const profile = await Profile.findOne({ user: req.user._id });
  let verifiedOn = false;

  if (profile) {
    const existing = profile.skills.find(
      (skill) => canonicalise(skill.name) === assessment.skill,
    );

    const RANK = { beginner: 1, intermediate: 2, advanced: 3 };

    if (existing) {
      if (!existing.verified || RANK[level] > RANK[existing.level]) {
        existing.level = level;
        existing.verified = true;
        verifiedOn = true;
      }
    } else {
      profile.skills.push({
        name: assessment.skill,
        category: assessment.category,
        level,
        verified: true,
      });
      verifiedOn = true;
    }

    await profile.save();
  }

  res.json({
    success: true,
    data: {
      attemptId: attempt._id,
      score,
      total,
      percentage,
      level,
      expired,
      verified: verifiedOn,
      review: assessment.questions.map((question, index) => ({
        prompt: question.prompt,
        explanation: question.explanation,
        selectedOption: answers[index].selectedOption,
        isCorrect: answers[index].isCorrect,
        options: question.options.map((option) => ({
          _id: option._id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      })),
    },
  });
});

export const reportProctoringViolation = asyncHandler(async (req, res) => {
  const attempt = await SkillAttempt.findOne({
    _id: req.params.attemptId,
    user: req.user._id,
  });
  if (!attempt) throw new ApiError(404, 'Attempt not found.');

  const outcome = recordProctoringViolation(attempt, req.body);
  await attempt.save();

  res.json({
    success: true,
    data: {
      ...outcome,
      result: outcome.disqualified
        ? {
            attemptId: attempt._id,
            score: 0,
            total: attempt.total,
            percentage: 0,
            level: 'beginner',
            expired: false,
            verified: false,
            disqualified: true,
            proctoringReason: attempt.proctoring.reason,
            review: [],
          }
        : null,
    },
  });
});

/** Attempt history for one skill, oldest first, for the improvement chart. */
export const skillHistory = asyncHandler(async (req, res) => {
  const skill = canonicalise(req.params.skill);

  const attempts = await SkillAttempt.find({
    user: req.user._id,
    skill,
    status: { $in: ['submitted', 'disqualified'] },
  })
    .select('percentage level score total submittedAt')
    .sort({ submittedAt: 1 })
    .lean();

  res.json({ success: true, data: { skill, attempts } });
});
