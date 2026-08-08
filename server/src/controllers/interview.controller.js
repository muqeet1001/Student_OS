import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scoreAnswer, summariseSession } from '../services/answerAnalyzer.js';

/** Fields safe to expose while the session is still running. */
const LIVE_QUESTION_FIELDS = '_id prompt round difficulty hint';

/**
 * Shape returned during a live session. The model answer and keywords are
 * withheld until the report, otherwise the student could read the expected
 * points straight off the payload before answering.
 */
function liveSession(session) {
  const answered = session.answers.length;
  const current = session.questions[answered];

  return {
    _id: session._id,
    round: session.round,
    difficulty: session.difficulty,
    targetRole: session.targetRole,
    status: session.status,
    progress: { answered, total: session.questions.length },
    currentQuestion: current
      ? {
          _id: current._id,
          prompt: current.prompt,
          hint: current.hint,
        }
      : null,
  };
}

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await InterviewSession.find({ user: req.user._id, status: 'completed' })
    .select('round difficulty targetRole overallScore verdict completedAt questions')
    .sort({ completedAt: -1 })
    .limit(20)
    .lean({ virtuals: true });

  const active = await InterviewSession.findOne({
    user: req.user._id,
    status: 'in-progress',
  })
    .select('round questions answers')
    .lean();

  const completed = sessions.length;
  const averageScore = completed
    ? Math.round(sessions.reduce((sum, item) => sum + item.overallScore, 0) / completed)
    : 0;

  res.json({
    success: true,
    data: {
      sessions: sessions.map((item) => ({ ...item, questionCount: item.questions.length })),
      summary: { completed, averageScore },
      activeSession: active
        ? {
            _id: active._id,
            round: active.round,
            questionCount: active.questions.length,
            answered: active.answers.length,
          }
        : null,
    },
  });
});

export const startSession = asyncHandler(async (req, res) => {
  const { round, difficulty, targetRole, questionCount } = req.body;

  // One open session at a time, so "resume" is never ambiguous.
  const existing = await InterviewSession.findOne({ user: req.user._id, status: 'in-progress' });
  if (existing) {
    throw new ApiError(409, 'You already have an interview in progress.', {
      sessionId: existing._id,
    });
  }

  const pool = await InterviewQuestion.aggregate([
    { $match: { round, difficulty, active: true } },
    { $sample: { size: questionCount } },
    { $project: { _id: 1 } },
  ]);

  if (pool.length === 0) {
    throw new ApiError(404, 'No questions are available for that round yet.');
  }

  const session = await InterviewSession.create({
    user: req.user._id,
    round,
    difficulty,
    targetRole,
    questions: pool.map((item) => item._id),
  });

  await session.populate({ path: 'questions', select: LIVE_QUESTION_FIELDS });

  res.status(201).json({ success: true, data: { session: liveSession(session) } });
});

export const getSession = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id,
  }).populate({
    path: 'questions answers.question',
    // A completed session may reveal everything; a live one is masked below.
    select: '_id prompt round difficulty hint modelAnswer keywords',
  });

  if (!session) throw new ApiError(404, 'Interview not found.');

  if (session.status !== 'completed') {
    return res.json({ success: true, data: { session: liveSession(session) } });
  }

  return res.json({
    success: true,
    data: {
      session: {
        _id: session._id,
        round: session.round,
        difficulty: session.difficulty,
        targetRole: session.targetRole,
        status: session.status,
        questionCount: session.questions.length,
        overallScore: session.overallScore,
        dimensions: session.dimensions,
        verdict: session.verdict,
        summary: session.summary,
        completedAt: session.completedAt,
        answers: session.answers,
      },
    },
  });
});

/** Finalises scoring and stamps the session complete. */
async function finalise(session) {
  const { overallScore, dimensions, verdict, summary } = summariseSession(session.answers);

  session.overallScore = overallScore;
  session.dimensions = dimensions;
  session.verdict = verdict;
  session.summary = summary;
  session.status = 'completed';
  session.completedAt = new Date();

  await session.save();
}

export const submitAnswer = asyncHandler(async (req, res) => {
  const { questionId, answer, secondsTaken, skipped } = req.body;

  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id,
  });

  if (!session) throw new ApiError(404, 'Interview not found.');
  if (session.status === 'completed') throw new ApiError(409, 'This interview is already finished.');

  const position = session.answers.length;
  const expected = session.questions[position];

  if (!expected) throw new ApiError(409, 'Every question has already been answered.');

  // Guards against a stale tab submitting against the previous question.
  if (String(expected) !== String(questionId)) {
    throw new ApiError(409, 'That is not the current question.');
  }

  const question = await InterviewQuestion.findById(questionId).lean();
  if (!question) throw new ApiError(404, 'Question not found.');

  const result = skipped
    ? {
        score: 0,
        dimensions: { structure: 0, specificity: 0, coverage: 0, delivery: 0 },
        feedback: [{ text: 'Skipped, so there was nothing to assess.', positive: false }],
      }
    : scoreAnswer(answer, question);

  session.answers.push({
    question: question._id,
    answer: skipped ? '' : answer,
    skipped: Boolean(skipped),
    score: result.score,
    dimensions: result.dimensions,
    feedback: result.feedback,
    secondsTaken,
  });

  if (session.answers.length === session.questions.length) {
    await finalise(session);
  } else {
    await session.save();
  }

  await session.populate({ path: 'questions', select: LIVE_QUESTION_FIELDS });

  res.json({
    success: true,
    data: {
      session:
        session.status === 'completed'
          ? { _id: session._id, status: 'completed' }
          : liveSession(session),
    },
  });
});

export const completeSession = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id,
  });

  if (!session) throw new ApiError(404, 'Interview not found.');
  if (session.status === 'completed') {
    return res.json({ success: true, data: { session: { _id: session._id, status: 'completed' } } });
  }

  // Ending early records the remaining questions as skipped, so the score
  // reflects the whole round rather than only the parts that were attempted.
  for (let i = session.answers.length; i < session.questions.length; i += 1) {
    session.answers.push({
      question: session.questions[i],
      answer: '',
      skipped: true,
      score: 0,
      dimensions: { structure: 0, specificity: 0, coverage: 0, delivery: 0 },
      feedback: [{ text: 'Not reached before the interview ended.', positive: false }],
      secondsTaken: 0,
    });
  }

  await finalise(session);

  return res.json({ success: true, data: { session: { _id: session._id, status: 'completed' } } });
});
