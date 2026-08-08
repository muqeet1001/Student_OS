import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { PlacementEvent } from '../src/models/PlacementEvent.js';
import {
  agendaFor,
  findSlotConflicts,
  generateSlots,
  groupByDay,
  markAgendaClashes,
  overlaps,
} from '../src/services/scheduling.js';

const id = () => new mongoose.Types.ObjectId();
const at = (iso) => new Date(iso);

const NINE_AM = '2026-03-10T09:00:00.000Z';

test('slots run back to back on a single panel', () => {
  const students = [id(), id(), id()];

  const slots = generateSlots({ students, startsAt: NINE_AM, durationMinutes: 30, panels: 1 });

  assert.deepEqual(
    slots.map((slot) => slot.startsAt.toISOString()),
    ['2026-03-10T09:00:00.000Z', '2026-03-10T09:30:00.000Z', '2026-03-10T10:00:00.000Z'],
  );
  assert.equal(slots[0].endsAt.toISOString(), '2026-03-10T09:30:00.000Z');
  assert.ok(
    slots.every((slot) => slot.panel === 1),
    'one panel means one lane',
  );
});

test('parallel panels see several students at the same time', () => {
  const students = [id(), id(), id(), id(), id()];

  const slots = generateSlots({ students, startsAt: NINE_AM, durationMinutes: 20, panels: 2 });

  // Two at 9:00, two at 9:20, one at 9:40.
  assert.equal(slots[0].startsAt.getTime(), slots[1].startsAt.getTime());
  assert.equal(slots[0].panel, 1);
  assert.equal(slots[1].panel, 2);
  assert.equal(slots[2].startsAt.toISOString(), '2026-03-10T09:20:00.000Z');
  assert.equal(slots[2].panel, 1, 'the third student goes back to panel 1');
  assert.equal(slots[4].startsAt.toISOString(), '2026-03-10T09:40:00.000Z');
});

test('panels are numbered from 1, since the number is shown to people', () => {
  const slots = generateSlots({ students: [id(), id()], startsAt: NINE_AM, panels: 2 });

  assert.deepEqual(slots.map((slot) => slot.panel), [1, 2], 'never "Panel 0"');
});

test('more panels than students leaves the extra panels idle rather than erroring', () => {
  const slots = generateSlots({ students: [id(), id()], startsAt: NINE_AM, panels: 5 });

  assert.equal(slots.length, 2);
  assert.equal(slots[0].startsAt.getTime(), slots[1].startsAt.getTime());
});

test('slot order is preserved, so a match-sorted shortlist keeps its order', () => {
  const students = [id(), id(), id()];
  const slots = generateSlots({ students, startsAt: NINE_AM, panels: 1 });

  assert.deepEqual(
    slots.map((slot) => String(slot.student)),
    students.map(String),
  );
});

test('slot generation rejects an unparseable start time instead of producing NaN times', () => {
  assert.throws(
    () => generateSlots({ students: [id()], startsAt: 'next tuesday' }),
    /valid start time/,
    'an Invalid Date would silently schedule every candidate at NaN',
  );
});

test('degenerate duration and panel counts are clamped, not trusted', () => {
  const slots = generateSlots({
    students: [id(), id()],
    startsAt: NINE_AM,
    durationMinutes: 0,
    panels: 0,
  });

  // A zero-minute slot would stack every candidate on one instant.
  assert.ok(slots[1].startsAt > slots[0].startsAt);
  assert.equal(slots[0].panel, 1);
});

test('an empty shortlist schedules nobody rather than throwing', () => {
  assert.deepEqual(generateSlots({ students: [], startsAt: NINE_AM }), []);
});

test('intervals that merely touch do not overlap', () => {
  const a = { startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T09:30:00Z') };
  const b = { startsAt: at('2026-03-10T09:30:00Z'), endsAt: at('2026-03-10T10:00:00Z') };

  assert.equal(overlaps(a, b), false, 'back-to-back interviews are not a clash');
  assert.equal(overlaps(b, a), false, 'and the check is symmetric');
});

test('a generated schedule never clashes with itself', () => {
  const students = Array.from({ length: 9 }, id);
  const slots = generateSlots({ students, startsAt: NINE_AM, durationMinutes: 20, panels: 3 });

  assert.deepEqual(findSlotConflicts([{ _id: id(), title: 'Day', slots }]), []);
});

/**
 * The realistic failure: one student shortlisted by two companies visiting
 * the same morning. Neither event can see it alone.
 */
test('a student double-booked across two events is flagged', () => {
  const clashed = id();

  const conflicts = findSlotConflicts([
    {
      _id: id(),
      title: 'Infosys interviews',
      company: 'Infosys',
      slots: [
        {
          student: clashed,
          startsAt: at('2026-03-10T09:00:00Z'),
          endsAt: at('2026-03-10T09:30:00Z'),
        },
      ],
    },
    {
      _id: id(),
      title: 'TCS interviews',
      company: 'TCS',
      slots: [
        {
          student: clashed,
          startsAt: at('2026-03-10T09:15:00Z'),
          endsAt: at('2026-03-10T09:45:00Z'),
        },
      ],
    },
  ]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].student, String(clashed));
  assert.equal(conflicts[0].a.company, 'Infosys', 'reported earliest first');
  assert.equal(conflicts[0].b.company, 'TCS');
});

test('different students at the same time are not a conflict', () => {
  const window = { startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T09:30:00Z') };

  const conflicts = findSlotConflicts([
    { _id: id(), title: 'A', slots: [{ student: id(), ...window }] },
    { _id: id(), title: 'B', slots: [{ student: id(), ...window }] },
  ]);

  assert.deepEqual(conflicts, [], 'two panels running in parallel is normal');
});

test('a cancelled slot cannot clash, since it is not a commitment', () => {
  const student = id();

  const conflicts = findSlotConflicts([
    {
      _id: id(),
      title: 'Cancelled',
      slots: [
        {
          student,
          startsAt: at('2026-03-10T09:00:00Z'),
          endsAt: at('2026-03-10T10:00:00Z'),
          status: 'cancelled',
        },
      ],
    },
    {
      _id: id(),
      title: 'Live',
      slots: [
        {
          student,
          startsAt: at('2026-03-10T09:15:00Z'),
          endsAt: at('2026-03-10T09:45:00Z'),
          status: 'scheduled',
        },
      ],
    },
  ]);

  assert.deepEqual(conflicts, []);
});

test('one long slot spanning several short ones reports every clash', () => {
  // Guards the inner-loop break: sorting by start alone would stop early.
  const student = id();

  const conflicts = findSlotConflicts([
    {
      _id: id(),
      title: 'All-day assessment',
      slots: [
        { student, startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T13:00:00Z') },
      ],
    },
    {
      _id: id(),
      title: 'Interviews',
      slots: [
        { student, startsAt: at('2026-03-10T10:00:00Z'), endsAt: at('2026-03-10T10:30:00Z') },
        { student, startsAt: at('2026-03-10T11:00:00Z'), endsAt: at('2026-03-10T11:30:00Z') },
      ],
    },
  ]);

  assert.equal(conflicts.length, 2, 'the long slot clashes with both short ones');
  assert.ok(
    conflicts.every((entry) => entry.a.eventTitle === 'All-day assessment'),
    'the long slot starts first, so it is always the earlier half of the pair',
  );
  assert.ok(conflicts.every((entry) => entry.student === String(student)));
});

test('a populated student object is matched to the same person as a raw id', () => {
  const student = id();

  const conflicts = findSlotConflicts([
    {
      _id: id(),
      title: 'A',
      slots: [
        {
          student: { _id: student, name: 'Asha' },
          startsAt: at('2026-03-10T09:00:00Z'),
          endsAt: at('2026-03-10T09:30:00Z'),
        },
      ],
    },
    {
      _id: id(),
      title: 'B',
      slots: [
        {
          student,
          startsAt: at('2026-03-10T09:10:00Z'),
          endsAt: at('2026-03-10T09:40:00Z'),
        },
      ],
    },
  ]);

  assert.equal(conflicts.length, 1, 'populate() must not hide a clash');
});

test('an event with no slots contributes nothing to the conflict scan', () => {
  assert.deepEqual(findSlotConflicts([{ _id: id(), title: 'Talk' }]), []);
  assert.deepEqual(findSlotConflicts([{ _id: id(), title: 'Talk', slots: [] }]), []);
});

/**
 * Being told "the drive starts at 9" when your interview is at 2pm is how
 * students end up waiting five hours in a corridor.
 */
test('a personal slot time overrides the event start time on the agenda', () => {
  const student = id();

  const agenda = agendaFor(student, [
    {
      _id: id(),
      title: 'Infosys drive',
      type: 'interview',
      audience: 'shortlist',
      startsAt: at('2026-03-10T09:00:00Z'),
      endsAt: at('2026-03-10T17:00:00Z'),
      venue: 'Main hall',
      slots: [
        {
          student,
          startsAt: at('2026-03-10T14:00:00Z'),
          endsAt: at('2026-03-10T14:30:00Z'),
          panel: 2,
          venue: 'Room 4',
          status: 'scheduled',
        },
      ],
    },
  ]);

  assert.equal(agenda.length, 1);
  assert.equal(agenda[0].startsAt.toISOString(), '2026-03-10T14:00:00.000Z');
  assert.equal(agenda[0].venue, 'Room 4', 'the slot venue wins too');
  assert.equal(agenda[0].slot.panel, 2);
});

test('college-wide events reach a student with no slot', () => {
  const agenda = agendaFor(id(), [
    {
      _id: id(),
      title: 'Placement orientation',
      type: 'pre-placement-talk',
      audience: 'college',
      startsAt: at('2026-03-01T10:00:00Z'),
      endsAt: at('2026-03-01T11:00:00Z'),
      slots: [],
    },
  ]);

  assert.equal(agenda.length, 1);
  assert.equal(agenda[0].slot, null, 'no personal time, so the client says "the event"');
});

test('a shortlist event without a slot for this student stays hidden', () => {
  // Otherwise every student sees every company's interview day.
  const agenda = agendaFor(id(), [
    {
      _id: id(),
      title: 'TCS interviews',
      audience: 'shortlist',
      startsAt: at('2026-03-10T09:00:00Z'),
      endsAt: at('2026-03-10T17:00:00Z'),
      slots: [{ student: id(), startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T09:30:00Z') }],
    },
  ]);

  assert.deepEqual(agenda, []);
});

test('a cancelled slot drops off the student agenda', () => {
  const student = id();

  const agenda = agendaFor(student, [
    {
      _id: id(),
      title: 'Withdrawn round',
      audience: 'shortlist',
      startsAt: at('2026-03-10T09:00:00Z'),
      endsAt: at('2026-03-10T17:00:00Z'),
      slots: [
        {
          student,
          startsAt: at('2026-03-10T09:00:00Z'),
          endsAt: at('2026-03-10T09:30:00Z'),
          status: 'cancelled',
        },
      ],
    },
  ]);

  assert.deepEqual(agenda, [], 'showing a cancelled interview would send a student to a room');
});

test('the agenda is sorted by the time the student is actually needed', () => {
  const student = id();

  const agenda = agendaFor(student, [
    {
      _id: id(),
      title: 'Late slot, early event',
      audience: 'shortlist',
      startsAt: at('2026-03-10T08:00:00Z'),
      endsAt: at('2026-03-10T18:00:00Z'),
      slots: [{ student, startsAt: at('2026-03-10T16:00:00Z'), endsAt: at('2026-03-10T16:30:00Z') }],
    },
    {
      _id: id(),
      title: 'Orientation',
      audience: 'college',
      startsAt: at('2026-03-10T10:00:00Z'),
      endsAt: at('2026-03-10T11:00:00Z'),
      slots: [],
    },
  ]);

  assert.deepEqual(
    agenda.map((entry) => entry.title),
    ['Orientation', 'Late slot, early event'],
    'sorted by slot time, not by event start',
  );
});

/**
 * The officer's clash list is not enough on its own — a student who turns up
 * to find they are expected in two rooms at once needed to know the evening
 * before.
 */
test('overlapping agenda entries name each other', () => {
  const flagged = markAgendaClashes([
    {
      title: 'Infosys interview',
      startsAt: at('2026-03-10T10:00:00Z'),
      endsAt: at('2026-03-10T10:30:00Z'),
    },
    {
      title: 'TCS interview',
      startsAt: at('2026-03-10T10:15:00Z'),
      endsAt: at('2026-03-10T11:00:00Z'),
    },
  ]);

  assert.deepEqual(flagged[0].clashesWith, ['TCS interview']);
  assert.deepEqual(flagged[1].clashesWith, ['Infosys interview'], 'both sides are told');
});

test('a clear agenda flags nothing', () => {
  const flagged = markAgendaClashes([
    { title: 'Morning', startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T10:00:00Z') },
    {
      title: 'Afternoon',
      startsAt: at('2026-03-10T14:00:00Z'),
      endsAt: at('2026-03-10T15:00:00Z'),
    },
  ]);

  assert.ok(flagged.every((entry) => entry.clashesWith.length === 0));
});

test('back-to-back agenda entries are not flagged as a clash', () => {
  const flagged = markAgendaClashes([
    { title: 'First', startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T09:30:00Z') },
    { title: 'Second', startsAt: at('2026-03-10T09:30:00Z'), endsAt: at('2026-03-10T10:00:00Z') },
  ]);

  assert.ok(
    flagged.every((entry) => entry.clashesWith.length === 0),
    'warning about a schedule that is merely tight would train students to ignore the warning',
  );
});

test('one entry overlapping two others names both of them', () => {
  const flagged = markAgendaClashes([
    { title: 'All day', startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T17:00:00Z') },
    { title: 'Talk', startsAt: at('2026-03-10T11:00:00Z'), endsAt: at('2026-03-10T12:00:00Z') },
    { title: 'Interview', startsAt: at('2026-03-10T14:00:00Z'), endsAt: at('2026-03-10T14:30:00Z') },
  ]);

  assert.deepEqual(flagged[0].clashesWith, ['Talk', 'Interview']);
  assert.deepEqual(flagged[1].clashesWith, ['All day']);
  assert.deepEqual(flagged[2].clashesWith, ['All day']);
});

test('marking clashes leaves the original entries untouched', () => {
  // The agenda is reused for grouping, so mutation here would be a silent bug.
  const agenda = [
    { title: 'A', startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T10:00:00Z') },
    { title: 'B', startsAt: at('2026-03-10T09:30:00Z'), endsAt: at('2026-03-10T10:30:00Z') },
  ];

  markAgendaClashes(agenda);

  assert.equal(agenda[0].clashesWith, undefined);
});

test('an empty agenda marks nothing rather than throwing', () => {
  assert.deepEqual(markAgendaClashes([]), []);
});

test('events group into days, earliest day and earliest event first', () => {
  const days = groupByDay([
    { title: 'Second', startsAt: at('2026-03-11T09:00:00Z') },
    { title: 'First late', startsAt: at('2026-03-10T15:00:00Z') },
    { title: 'First early', startsAt: at('2026-03-10T09:00:00Z') },
  ]);

  assert.deepEqual(
    days.map((entry) => entry.day),
    ['2026-03-10', '2026-03-11'],
  );
  assert.deepEqual(
    days[0].events.map((entry) => entry.title),
    ['First early', 'First late'],
  );
});

test('an event with an unusable date is dropped rather than creating a NaN day', () => {
  const days = groupByDay([
    { title: 'Good', startsAt: at('2026-03-10T09:00:00Z') },
    { title: 'Broken', startsAt: 'not a date' },
  ]);

  assert.equal(days.length, 1);
  assert.equal(days[0].day, '2026-03-10');
});

test('an event requires a title and both ends of its time', () => {
  const error = new PlacementEvent({}).validateSync();

  assert.ok(error.errors.title);
  assert.ok(error.errors.startsAt);
  assert.ok(error.errors.endsAt);
});

test('an event cannot end before it starts', () => {
  const event = new PlacementEvent({
    title: 'Backwards',
    startsAt: at('2026-03-10T17:00:00Z'),
    endsAt: at('2026-03-10T09:00:00Z'),
  });

  assert.ok(event.validateSync().errors.endsAt, 'a negative-length event would break every range query');
});

test('a zero-length event is allowed, since a deadline is a moment', () => {
  const moment = at('2026-03-10T17:00:00Z');
  const event = new PlacementEvent({
    title: 'Applications close',
    type: 'deadline',
    startsAt: moment,
    endsAt: moment,
  });

  assert.equal(event.validateSync(), undefined);
});

test('slot counts are derived, so they cannot drift from the slots', () => {
  const event = new PlacementEvent({
    title: 'Interview day',
    startsAt: at('2026-03-10T09:00:00Z'),
    endsAt: at('2026-03-10T17:00:00Z'),
    slots: [
      { student: id(), startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T09:30:00Z'), status: 'attended' },
      { student: id(), startsAt: at('2026-03-10T09:30:00Z'), endsAt: at('2026-03-10T10:00:00Z'), status: 'no-show' },
      { student: id(), startsAt: at('2026-03-10T10:00:00Z'), endsAt: at('2026-03-10T10:30:00Z') },
    ],
  });

  assert.equal(event.slotCount, 3);
  assert.equal(event.attendedCount, 1);
});

test('a slot rejects a status outside the attendance lifecycle', () => {
  const event = new PlacementEvent({
    title: 'Interview day',
    startsAt: at('2026-03-10T09:00:00Z'),
    endsAt: at('2026-03-10T17:00:00Z'),
    slots: [
      { student: id(), startsAt: at('2026-03-10T09:00:00Z'), endsAt: at('2026-03-10T09:30:00Z'), status: 'maybe' },
    ],
  });

  assert.ok(event.validateSync());
});
