import { PlacementEvent } from '../models/PlacementEvent.js';
import { Training } from '../models/Training.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkinWindow, currentCode, verifyCode } from '../services/checkinToken.js';

/**
 * The two things that can be checked into, described the same way so one set
 * of handlers serves both.
 */
const SUBJECTS = {
  event: {
    model: PlacementEvent,
    roll: (subject) => subject.slots,
    notFound: 'Event not found.',
    absent: 'You do not have a slot at this event.',
  },
  training: {
    model: Training,
    roll: (subject) => subject.attendance,
    notFound: 'Session not found.',
    absent: 'You are not on the list for this session.',
  },
};

async function load(kind, id) {
  const subject = await SUBJECTS[kind].model.findById(id);
  if (!subject) throw new ApiError(404, SUBJECTS[kind].notFound);
  return subject;
}

/**
 * The code to put on the projector.
 *
 * Regenerated every period, so the page has to poll. Staff only — handing
 * the code generator to students would defeat the entire mechanism.
 */
export function makeCodeHandler(kind) {
  return asyncHandler(async (req, res) => {
    const subject = await load(kind, req.params.id);
    const window = checkinWindow(subject);

    res.json({
      success: true,
      data: {
        ...currentCode(String(subject._id), config.checkinSecret),
        window,
        title: subject.title,
        // Counted here so the projector can show "18 of 24 checked in"
        // without staff walking the room.
        checkedIn: SUBJECTS[kind].roll(subject).filter((entry) => entry.status === 'attended').length,
        expected: SUBJECTS[kind].roll(subject).length,
      },
    });
  });
}

/**
 * A student presenting the code.
 *
 * Three gates: the window has to be open, the code has to be live, and the
 * student has to already be on the roll. The last one is what stops a leaked
 * code conjuring attendance for someone who was never invited.
 */
export function makeCheckinHandler(kind) {
  return asyncHandler(async (req, res) => {
    const subject = await load(kind, req.params.id);
    const window = checkinWindow(subject);

    if (!window.open) {
      throw new ApiError(
        400,
        window.reason === 'not-yet'
          ? 'Check-in has not opened yet.'
          : 'Check-in for this session has closed.',
      );
    }

    if (!verifyCode(req.body.code, String(subject._id), config.checkinSecret)) {
      throw new ApiError(400, 'That code is wrong or has expired. Check the screen again.');
    }

    const roll = SUBJECTS[kind].roll(subject);
    const entry = roll.find(
      (row) => String(row.student?._id ?? row.student) === String(req.user._id),
    );

    if (!entry) throw new ApiError(403, SUBJECTS[kind].absent);

    // Scanning twice is not an error. A student who is unsure whether it
    // worked will scan again, and showing them a failure is worse than
    // useless — they will go and queue at the desk.
    const alreadyIn = entry.status === 'attended';

    entry.status = 'attended';
    entry.markedAt = entry.markedAt ?? new Date();
    await subject.save();

    res.json({
      success: true,
      data: {
        message: alreadyIn ? 'You were already checked in.' : 'Checked in.',
        alreadyIn,
        title: subject.title,
        at: entry.markedAt,
      },
    });
  });
}
