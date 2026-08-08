import { Training } from '../models/Training.js';
import { ReadinessSnapshot } from '../models/ReadinessSnapshot.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { attendanceSummary, measureEffectiveness } from '../services/trainingEffectiveness.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const listTrainings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const sessions = await Training.find(filter)
    .sort({ startsAt: -1 })
    .lean({ virtuals: true });

  const withAttendance = sessions.map((session) => ({
    ...session,
    attendanceSummary: attendanceSummary(session),
  }));

  const completed = withAttendance.filter((session) => session.status === 'completed');

  res.json({
    success: true,
    data: {
      sessions: withAttendance,
      totals: {
        sessions: sessions.length,
        completed: completed.length,
        // Distinct students reached, not seats filled: the same twenty
        // students attending five sessions is not a hundred students trained.
        studentsReached: new Set(
          sessions.flatMap((session) =>
            (session.attendance ?? [])
              .filter((entry) => entry.status === 'attended')
              .map((entry) => String(entry.student)),
          ),
        ).size,
        spend: sessions.reduce((sum, session) => sum + (session.cost ?? 0), 0),
      },
    },
  });
});

export const getTraining = asyncHandler(async (req, res) => {
  const session = await Training.findById(req.params.trainingId)
    .populate('attendance.student', 'name email')
    .lean({ virtuals: true });

  if (!session) throw new ApiError(404, 'Session not found.');

  res.json({
    success: true,
    data: { session, attendanceSummary: attendanceSummary(session) },
  });
});

export const createTraining = asyncHandler(async (req, res) => {
  const session = await Training.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { session } });
});

export const updateTraining = asyncHandler(async (req, res) => {
  const session = await Training.findById(req.params.trainingId);
  if (!session) throw new ApiError(404, 'Session not found.');

  // Saved through the document so the end-before-start guard runs against
  // the merged result rather than only the fields that were sent.
  Object.assign(session, req.body);
  await session.save();

  res.json({ success: true, data: { session } });
});

export const deleteTraining = asyncHandler(async (req, res) => {
  const session = await Training.findByIdAndDelete(req.params.trainingId);
  if (!session) throw new ApiError(404, 'Session not found.');

  res.json({ success: true, data: { message: 'Session deleted.' } });
});

export const enrolStudents = asyncHandler(async (req, res) => {
  const session = await Training.findById(req.params.trainingId);
  if (!session) throw new ApiError(404, 'Session not found.');

  const { students, replace } = req.body;

  const valid = await User.find({ _id: { $in: students }, role: 'student' })
    .select('_id')
    .lean();
  const validIds = valid.map((student) => String(student._id));

  if (replace) {
    session.attendance = validIds.map((student) => ({ student, status: 'registered' }));
  } else {
    // Re-enrolling an existing student must not create a second row, or the
    // attendance rate quietly drifts below 100%.
    const existing = new Set(session.attendance.map((entry) => String(entry.student)));
    for (const student of validIds) {
      if (!existing.has(student)) session.attendance.push({ student, status: 'registered' });
    }
  }

  await session.save();

  res.json({
    success: true,
    data: { session, enrolled: session.attendance.length, skipped: students.length - validIds.length },
  });
});

/**
 * Marks the roll.
 *
 * Everyone not named is marked absent rather than left as registered:
 * "registered" after the session has happened is not a fact about anyone,
 * and leaving it there would inflate every attendance rate.
 */
export const markAttendance = asyncHandler(async (req, res) => {
  const session = await Training.findById(req.params.trainingId);
  if (!session) throw new ApiError(404, 'Session not found.');

  const present = new Set(req.body.attended);
  const markedAt = new Date();

  for (const entry of session.attendance) {
    entry.status = present.has(String(entry.student)) ? 'attended' : 'absent';
    entry.markedAt = markedAt;
  }

  await session.save();
  await session.populate('attendance.student', 'name email');

  res.json({
    success: true,
    data: { session, attendanceSummary: attendanceSummary(session) },
  });
});

/**
 * Did it work?
 *
 * Compares attendees against everyone else over the same window, because
 * readiness rises anyway and a session run during a busy month would
 * otherwise look like a triumph on its own.
 */
export const getEffectiveness = asyncHandler(async (req, res) => {
  const session = await Training.findById(req.params.trainingId)
    .populate('attendance.student', 'name')
    .lean();

  if (!session) throw new ApiError(404, 'Session not found.');

  const windowDays = Math.min(180, Math.max(7, Number(req.query.windowDays) || 30));

  // A little history before the session is needed for the "before" reading,
  // since a student who last opened the app a fortnight ago still has one.
  const from = new Date(new Date(session.startsAt).getTime() - 30 * DAY_MS);
  const to = new Date(new Date(session.startsAt).getTime() + windowDays * DAY_MS);

  const snapshots = await ReadinessSnapshot.find({ day: { $gte: from, $lte: to } })
    .select('user day score components')
    .lean();

  res.json({
    success: true,
    data: {
      session: { _id: session._id, title: session.title, startsAt: session.startsAt },
      effectiveness: measureEffectiveness({ session, snapshots, windowDays }),
    },
  });
});
