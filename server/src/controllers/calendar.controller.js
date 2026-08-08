import { PlacementEvent } from '../models/PlacementEvent.js';
import { Drive } from '../models/Drive.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  agendaFor,
  findSlotConflicts,
  generateSlots,
  groupByDay,
  markAgendaClashes,
} from '../services/scheduling.js';

/** Parses a `from`/`to` query into a Mongo range, defaulting to the next 90 days. */
function rangeFrom(query) {
  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to
    ? new Date(query.to)
    : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError(400, 'Invalid date range.');
  }

  return { from, to };
}

/** The whole calendar, grouped into days, with any double-bookings flagged. */
export const listEvents = asyncHandler(async (req, res) => {
  const { from, to } = rangeFrom(req.query);

  const filter = { startsAt: { $gte: from, $lte: to } };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  const events = await PlacementEvent.find(filter)
    .populate('slots.student', 'name email')
    .sort({ startsAt: 1 })
    .lean({ virtuals: true });

  res.json({
    success: true,
    data: {
      events,
      days: groupByDay(events),
      /*
       * Surfaced with the calendar rather than behind a separate check: a
       * clash the officer has to go looking for is a clash that ships. The
       * realistic case is one student shortlisted by two companies visiting
       * the same morning, which neither event can see on its own.
       */
      conflicts: findSlotConflicts(events),
      range: { from, to },
    },
  });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await PlacementEvent.findById(req.params.eventId)
    .populate('slots.student', 'name email')
    .populate('drive', 'company role')
    .lean({ virtuals: true });

  if (!event) throw new ApiError(404, 'Event not found.');
  res.json({ success: true, data: { event } });
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await PlacementEvent.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { event } });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await PlacementEvent.findById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  // Assigned through the document rather than findByIdAndUpdate so the
  // start-before-end guard in the schema runs against the merged result.
  Object.assign(event, req.body);
  await event.save();

  res.json({ success: true, data: { event } });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await PlacementEvent.findByIdAndDelete(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  res.json({ success: true, data: { message: 'Event deleted.' } });
});

/**
 * Fills an event's slots from its drive's shortlist.
 *
 * Replaces any existing slots: regenerating is how an officer responds to a
 * changed shortlist, and merging would silently keep candidates who have
 * since been rejected.
 */
export const scheduleFromShortlist = asyncHandler(async (req, res) => {
  const event = await PlacementEvent.findById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (!event.drive) throw new ApiError(400, 'This event is not linked to a drive.');

  const drive = await Drive.findById(event.drive).lean();
  if (!drive) throw new ApiError(404, 'The linked drive no longer exists.');

  const { startsAt, durationMinutes, panels, venue, stages } = req.body;

  // Strongest candidates first: panels tire, and the order is a real
  // advantage worth spending deliberately rather than by insertion order.
  const candidates = drive.shortlist
    .filter((entry) => stages.includes(entry.stage))
    .sort((a, b) => (b.matchAtShortlist ?? 0) - (a.matchAtShortlist ?? 0));

  if (!candidates.length) {
    throw new ApiError(400, 'No shortlisted students match those stages.');
  }

  const slots = generateSlots({
    students: candidates.map((entry) => entry.student),
    startsAt,
    durationMinutes,
    panels,
  });

  event.slots = slots.map((slot) => ({ ...slot, venue: venue ?? event.venue }));

  // The last slot defines the real end of the day, so the calendar block
  // matches how long the event will actually run.
  const lastEnd = slots.at(-1).endsAt;
  if (event.endsAt < lastEnd) event.endsAt = lastEnd;

  await event.save();
  await event.populate('slots.student', 'name email');

  res.json({ success: true, data: { event, scheduled: slots.length } });
});

export const updateSlot = asyncHandler(async (req, res) => {
  const event = await PlacementEvent.findById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const slot = event.slots.id(req.params.slotId);
  if (!slot) throw new ApiError(404, 'Slot not found.');

  Object.assign(slot, req.body);
  await event.save();
  await event.populate('slots.student', 'name email');

  res.json({ success: true, data: { event } });
});

/**
 * The student's own agenda.
 *
 * A personal slot time always beats the event's start time — being told
 * "the drive starts at 9" when your interview is at 2pm is how students end
 * up waiting five hours in a corridor.
 */
export const myAgenda = asyncHandler(async (req, res) => {
  const from = new Date();
  const to = new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

  const events = await PlacementEvent.find({
    status: { $ne: 'cancelled' },
    endsAt: { $gte: from },
    startsAt: { $lte: to },
    $or: [{ audience: 'college' }, { 'slots.student': req.user._id }],
  })
    .sort({ startsAt: 1 })
    .lean();

  // Clashes are repeated here rather than left to the officer's view: a
  // student expected in two rooms at once needs to know the evening before.
  const agenda = markAgendaClashes(agendaFor(req.user._id, events));

  res.json({
    success: true,
    data: {
      agenda,
      days: groupByDay(agenda),
      next: agenda[0] ?? null,
      clashes: agenda.filter((entry) => entry.clashesWith.length > 0).length,
    },
  });
});
