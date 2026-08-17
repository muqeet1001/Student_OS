import mongoose from 'mongoose';
import { Test, TestAttempt, TestQuestion } from '../models/Test.js';
import { Profile } from '../models/Profile.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { recordProctoringViolation } from '../services/proctoring.js';

/** Grace for network latency, so a submit sent just before time is accepted. */
const SUBMIT_GRACE_MS = 5000;

/** Shape sent while an attempt is running — never includes which option is right. */
function maskQuestion(question) {
  return {
    _id: question._id,
    prompt: question.prompt,
    topic: question.topic,
    difficulty: question.difficulty,
    marks: question.marks,
    options: question.options.map((option) => ({ _id: option._id, text: option.text })),
  };
}

export const listTests = asyncHandler(async (req, res) => {
  const tests = await Test.find({ isPublished: true }).sort({ category: 1, title: 1 }).lean();

  const attempts = await TestAttempt.find({
    user: req.user._id,
    status: { $in: ['submitted', 'disqualified'] },
  })
    .select('test percentage passed status submittedAt proctoring.reason')
    .sort({ submittedAt: -1 })
    .lean();

  // Only the most recent attempt per test is surfaced on the card.
  const bestByTest = new Map();
  for (const attempt of attempts) {
    const key = String(attempt.test);
    if (!bestByTest.has(key)) bestByTest.set(key, attempt);
  }

  const active = await TestAttempt.findOne({
    user: req.user._id,
    status: 'in-progress',
    expiresAt: { $gt: new Date() },
  })
    .select('test expiresAt')
    .populate('test', 'slug title')
    .lean();

  res.json({
    success: true,
    data: {
      tests: tests.map((test) => ({
        ...test,
        lastAttempt: bestByTest.get(String(test._id)) ?? null,
      })),
      activeAttempt: active
        ? {
            attemptId: active._id,
            slug: active.test?.slug,
            title: active.test?.title,
            expiresAt: active.expiresAt,
          }
        : null,
    },
  });
});

export const startAttempt = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ slug: req.params.slug, isPublished: true });
  if (!test) throw ApiError.notFound('That test does not exist');

  // Resume rather than duplicate if one is already running for this test.
  const existing = await TestAttempt.findOne({
    user: req.user._id,
    test: test._id,
    status: 'in-progress',
    expiresAt: { $gt: new Date() },
  });

  if (existing) {
    const questions = await TestQuestion.find({ _id: { $in: existing.questions } }).lean();
    const ordered = existing.questions.map((id) =>
      questions.find((question) => String(question._id) === String(id)),
    );

    return res.json({
      success: true,
      data: {
        attemptId: existing._id,
        test,
        questions: ordered.filter(Boolean).map(maskQuestion),
        answers: existing.answers,
        expiresAt: existing.expiresAt,
        proctoring: { warningCount: existing.proctoring?.warningCount ?? 0 },
        resumed: true,
      },
    });
  }

  const picked = await TestQuestion.aggregate([
    { $match: { test: new mongoose.Types.ObjectId(test._id) } },
    { $sample: { size: test.questionCount } },
  ]);

  if (!picked.length) {
    throw ApiError.badRequest('This test has no questions yet');
  }

  const attempt = await TestAttempt.create({
    user: req.user._id,
    test: test._id,
    questions: picked.map((question) => question._id),
    expiresAt: new Date(Date.now() + test.durationMinutes * 60_000),
    maxScore: picked.reduce((total, question) => total + (question.marks || 1), 0),
  });

  return res.status(201).json({
    success: true,
    data: {
      attemptId: attempt._id,
      test,
      questions: picked.map(maskQuestion),
      answers: [],
      expiresAt: attempt.expiresAt,
      proctoring: { warningCount: 0 },
      resumed: false,
    },
  });
});

/**
 * Records answers mid-attempt so a refresh or a dropped connection does not
 * lose progress. Correctness is not evaluated here.
 */
export const saveAnswers = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, user: req.user._id });
  if (!attempt) throw ApiError.notFound('That attempt does not exist');
  if (attempt.status !== 'in-progress') throw ApiError.badRequest('This attempt is already finished');

  const allowed = new Set(attempt.questions.map(String));
  const merged = new Map(attempt.answers.map((answer) => [String(answer.question), answer]));

  for (const { question, selectedOption } of req.body.answers) {
    if (!allowed.has(String(question))) continue;
    merged.set(String(question), { question, selectedOption: selectedOption ?? null });
  }

  attempt.answers = [...merged.values()];
  await attempt.save();

  res.json({
    success: true,
    data: { saved: attempt.answers.length, expiresAt: attempt.expiresAt },
  });
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, user: req.user._id });
  if (!attempt) throw ApiError.notFound('That attempt does not exist');
  if (attempt.status === 'disqualified') {
    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: 0,
        maxScore: attempt.maxScore,
        percentage: 0,
        passed: false,
        disqualified: true,
        proctoringReason: attempt.proctoring?.reason,
        durationSeconds: attempt.durationSeconds,
        correctCount: 0,
        totalCount: attempt.questions.length,
      },
    });
  }
  if (attempt.status !== 'in-progress') throw ApiError.badRequest('This attempt is already finished');

  const now = new Date();
  // The deadline is the stored one, not anything the client sends, so a
  // tampered clock cannot buy extra time.
  const lateBy = now - attempt.expiresAt;
  const expired = lateBy > SUBMIT_GRACE_MS;

  const questions = await TestQuestion.find({ _id: { $in: attempt.questions } }).lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));

  const submitted = new Map(
    (req.body.answers ?? []).map((answer) => [String(answer.question), answer.selectedOption]),
  );
  for (const answer of attempt.answers) {
    if (!submitted.has(String(answer.question))) {
      submitted.set(String(answer.question), answer.selectedOption);
    }
  }

  let score = 0;
  const graded = attempt.questions.map((questionId) => {
    const question = byId.get(String(questionId));
    const selectedOption = submitted.get(String(questionId)) ?? null;

    const correctOption = question?.options.find((option) => option.isCorrect);
    const isCorrect =
      Boolean(selectedOption) && String(selectedOption) === String(correctOption?._id);

    const marksAwarded = isCorrect ? question?.marks ?? 1 : 0;
    score += marksAwarded;

    return { question: questionId, selectedOption, isCorrect, marksAwarded };
  });

  const maxScore = questions.reduce((total, question) => total + (question.marks || 1), 0);
  const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;

  const test = await Test.findById(attempt.test).lean();
  const passed = percentage >= (test?.passPercentage ?? 60);

  attempt.set({
    answers: graded,
    score,
    maxScore,
    percentage,
    passed,
    status: expired ? 'expired' : 'submitted',
    submittedAt: now,
    durationSeconds: Math.round((now - attempt.startedAt) / 1000),
  });
  await attempt.save();

  // Passing marks the skills this test verifies on the student's profile.
  if (passed && test?.verifies?.length) {
    const profile = await Profile.findOrCreateFor(req.user._id);
    let touched = false;

    for (const skillName of test.verifies) {
      const existing = profile.skills.find(
        (skill) => skill.name.toLowerCase() === skillName.toLowerCase(),
      );
      if (existing) {
        if (!existing.verified) {
          existing.verified = true;
          touched = true;
        }
      } else {
        profile.skills.push({ name: skillName, verified: true, level: 'intermediate' });
        touched = true;
      }
    }

    if (touched) await profile.save();
  }

  res.json({
    success: true,
    data: {
      attemptId: attempt._id,
      score,
      maxScore,
      percentage,
      passed,
      expired,
      durationSeconds: attempt.durationSeconds,
      correctCount: graded.filter((answer) => answer.isCorrect).length,
      totalCount: graded.length,
    },
  });
});

/** Records an on-device detector event and enforces the second-warning zero. */
export const reportProctoringViolation = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, user: req.user._id });
  if (!attempt) throw ApiError.notFound('That attempt does not exist');

  const outcome = recordProctoringViolation(attempt, req.body);
  if (outcome.disqualified && !attempt.durationSeconds) {
    attempt.durationSeconds = Math.max(0, Math.round((Date.now() - attempt.startedAt) / 1000));
  }
  await attempt.save();

  res.json({
    success: true,
    data: {
      ...outcome,
      result: outcome.disqualified
        ? {
            attemptId: attempt._id,
            score: 0,
            maxScore: attempt.maxScore,
            percentage: 0,
            passed: false,
            disqualified: true,
            proctoringReason: attempt.proctoring.reason,
            durationSeconds: attempt.durationSeconds,
            correctCount: 0,
            totalCount: attempt.questions.length,
          }
        : null,
    },
  });
});

/** Full review with correct answers — only available once an attempt is over. */
export const getAttempt = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, user: req.user._id })
    .populate('test', 'title slug category durationMinutes passPercentage')
    .lean();

  if (!attempt) throw ApiError.notFound('That attempt does not exist');
  if (attempt.status === 'in-progress') {
    throw ApiError.badRequest('Finish the attempt before reviewing it');
  }

  const questions = await TestQuestion.find({ _id: { $in: attempt.questions } }).lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));

  res.json({
    success: true,
    data: {
      attempt: {
        ...attempt,
        review: attempt.answers.map((answer) => {
          const question = byId.get(String(answer.question));
          return {
            prompt: question?.prompt ?? '',
            explanation: question?.explanation ?? '',
            topic: question?.topic ?? '',
            selectedOption: answer.selectedOption,
            isCorrect: answer.isCorrect,
            options: (question?.options ?? []).map((option) => ({
              _id: option._id,
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          };
        }),
      },
    },
  });
});

export const listAttempts = asyncHandler(async (req, res) => {
  const attempts = await TestAttempt.find({
    user: req.user._id,
    status: { $in: ['submitted', 'expired', 'disqualified'] },
  })
    .populate('test', 'title slug category')
    .sort({ submittedAt: -1 })
    .limit(50)
    .lean();

  const summary = attempts.reduce(
    (acc, attempt) => ({
      taken: acc.taken + 1,
      passed: acc.passed + (attempt.passed ? 1 : 0),
      totalPercentage: acc.totalPercentage + attempt.percentage,
    }),
    { taken: 0, passed: 0, totalPercentage: 0 },
  );

  res.json({
    success: true,
    data: {
      attempts,
      summary: {
        taken: summary.taken,
        passed: summary.passed,
        averagePercentage: summary.taken ? Math.round(summary.totalPercentage / summary.taken) : 0,
      },
    },
  });
});
