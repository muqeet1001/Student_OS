import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { Training } from '../src/models/Training.js';
import {
  attendanceSummary,
  measureEffectiveness,
  __testing,
} from '../src/services/trainingEffectiveness.js';

const { MIN_GROUP } = __testing;

const id = () => new mongoose.Types.ObjectId();
const at = (iso) => new Date(iso);

const SESSION_DAY = '2026-03-01T09:00:00Z';
/** Comfortably past the 30-day window, so results are measurable. */
const NOW = at('2026-05-01T00:00:00Z');

const day = (offset) => new Date(at(SESSION_DAY).getTime() + offset * 86_400_000);

/** A student with a readiness reading before and after the session. */
function snapshots(user, before, after, components = {}) {
  const parts = { skills: 0, coding: 0, resume: 0, interview: 0, projects: 0 };
  return [
    { user, day: day(-3), score: before, components: { ...parts } },
    {
      user,
      day: day(20),
      score: after,
      components: Object.fromEntries(
        Object.entries(parts).map(([key, value]) => [key, value + (components[key] ?? 0)]),
      ),
    },
  ];
}

/** Builds a session plus a cohort where attendees and others each gain a set amount. */
function scenario({ attendeeGain, othersGain, attendees = 5, others = 10, ...rest }) {
  const attendeeIds = Array.from({ length: attendees }, id);
  const otherIds = Array.from({ length: others }, id);

  return {
    session: {
      startsAt: at(SESSION_DAY),
      attendance: attendeeIds.map((student) => ({ student, status: 'attended' })),
      ...rest,
    },
    snapshots: [
      ...attendeeIds.flatMap((user) => snapshots(user, 40, 40 + attendeeGain, rest.components)),
      ...otherIds.flatMap((user) => snapshots(user, 40, 40 + othersGain)),
    ],
  };
}

/**
 * The whole reason this service exists. "Attendees gained 12 points" is
 * worthless if everyone gained 12 points that month.
 */
test('a gain the whole cohort shared is not credited to the training', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 12, othersGain: 12 });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.measurable, true);
  assert.equal(result.attendees.meanDelta, 12);
  assert.equal(result.comparison.meanDelta, 12);
  assert.equal(result.lift, 0, 'the session moved nothing that would not have moved anyway');
  assert.equal(result.verdict, 'inconclusive');
});

test('a gain beyond what everyone else managed is credited as lift', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 18, othersGain: 6 });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.lift, 12);
  assert.equal(result.verdict, 'positive');
});

test('a session whose attendees did worse than everyone else reports negative', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 2, othersGain: 10 });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.lift, -8);
  assert.equal(result.verdict, 'negative', 'a wasted Saturday should be reported as one');
});

test('a lift within noise is called inconclusive rather than a success', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 11, othersGain: 10 });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.lift, 1);
  assert.equal(result.verdict, 'inconclusive', 'one point is not an effect');
});

/**
 * The honesty requirement: this is observational, and the students who turn
 * up to an 8am Saturday bootcamp were going to improve anyway.
 */
test('every result carries the selection-bias caveat', () => {
  const measurable = measureEffectiveness({
    ...scenario({ attendeeGain: 18, othersGain: 6 }),
    now: NOW,
  });
  const unmeasurable = measureEffectiveness({
    session: { startsAt: at(SESSION_DAY), attendance: [] },
    snapshots: [],
    now: NOW,
  });

  assert.match(measurable.caveat, /upper bound/);
  assert.match(unmeasurable.caveat, /upper bound/, 'the caveat is not conditional on a result');
});

test('nothing is reported until the window has closed', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 18, othersGain: 6 });

  const result = measureEffectiveness({
    session,
    snapshots: rows,
    // Ten days in: attendees may look transformed, and it means nothing yet.
    now: day(10),
  });

  assert.equal(result.measurable, false);
  assert.match(result.reason, /has not closed yet/);
  assert.equal(result.lift, null);
});

test('a group too small to mean anything is refused rather than reported', () => {
  const { session, snapshots: rows } = scenario({
    attendeeGain: 30,
    othersGain: 0,
    attendees: MIN_GROUP - 1,
  });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.measurable, false);
  assert.match(result.reason, /Only 2 attendees/);
  assert.equal(result.lift, null, 'a 30-point lift from two students is one person having a week');
});

test('a session with no comparison group is refused, however well attendees did', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 25, othersGain: 0, others: 1 });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.measurable, false);
  assert.match(result.reason, /nothing to compare against/);
});

test('students with no reading on both sides are excluded, not assumed to be zero', () => {
  const attendees = [id(), id(), id(), id()];
  const others = [id(), id(), id()];

  const rows = [
    ...attendees.slice(0, 3).flatMap((user) => snapshots(user, 40, 55)),
    // This one only ever opened the app after the session. Treating the
    // missing "before" as zero would invent a 52-point gain.
    { user: attendees[3], day: day(15), score: 52, components: {} },
    ...others.flatMap((user) => snapshots(user, 40, 45)),
  ];

  const result = measureEffectiveness({
    session: {
      startsAt: at(SESSION_DAY),
      attendance: attendees.map((student) => ({ student, status: 'attended' })),
    },
    snapshots: rows,
    now: NOW,
  });

  assert.equal(result.attended, 4);
  assert.equal(result.attendees.measured, 3, 'only those with two readings can show a delta');
  assert.equal(result.attendees.meanDelta, 15);
});

test('registered-but-absent students are counted with the comparison group', () => {
  // They did not receive the training, so crediting it with their progress
  // would be measuring the invitation rather than the session.
  const attended = [id(), id(), id()];
  const absent = [id(), id(), id()];

  const rows = [
    ...attended.flatMap((user) => snapshots(user, 40, 60)),
    ...absent.flatMap((user) => snapshots(user, 40, 45)),
  ];

  const result = measureEffectiveness({
    session: {
      startsAt: at(SESSION_DAY),
      attendance: [
        ...attended.map((student) => ({ student, status: 'attended' })),
        ...absent.map((student) => ({ student, status: 'absent' })),
      ],
    },
    snapshots: rows,
    now: NOW,
  });

  assert.equal(result.attendees.measured, 3);
  assert.equal(result.comparison.measured, 3);
  assert.equal(result.lift, 15);
});

test('the latest reading before the session is the baseline, not the earliest', () => {
  const attendees = [id(), id(), id()];
  const others = [id(), id(), id()];

  const rows = [
    ...attendees.flatMap((user) => [
      { user, day: day(-25), score: 20, components: {} },
      // A student who improved a lot before the session should not have that
      // earlier progress rolled into the session's result.
      { user, day: day(-1), score: 50, components: {} },
      { user, day: day(20), score: 60, components: {} },
    ]),
    ...others.flatMap((user) => snapshots(user, 40, 45)),
  ];

  const result = measureEffectiveness({ session: {
    startsAt: at(SESSION_DAY),
    attendance: attendees.map((student) => ({ student, status: 'attended' })),
  }, snapshots: rows, now: NOW });

  assert.equal(result.attendees.meanDelta, 10, '60 - 50, not 60 - 20');
});

test('readings after the window are ignored', () => {
  const attendees = [id(), id(), id()];
  const others = [id(), id(), id()];

  const rows = [
    ...attendees.flatMap((user) => [
      { user, day: day(-1), score: 40, components: {} },
      { user, day: day(20), score: 50, components: {} },
      // Two months later is not this session's doing.
      { user, day: day(60), score: 90, components: {} },
    ]),
    ...others.flatMap((user) => snapshots(user, 40, 45)),
  ];

  const result = measureEffectiveness({ session: {
    startsAt: at(SESSION_DAY),
    attendance: attendees.map((student) => ({ student, status: 'attended' })),
  }, snapshots: rows, windowDays: 30, now: NOW });

  assert.equal(result.attendees.meanDelta, 10);
});

test('the median delta is reported alongside the mean', () => {
  const attendees = [id(), id(), id(), id(), id()];
  const others = [id(), id(), id()];

  const gains = [5, 5, 5, 5, 60];
  const rows = [
    ...attendees.flatMap((user, index) => snapshots(user, 40, 40 + gains[index])),
    ...others.flatMap((user) => snapshots(user, 40, 45)),
  ];

  const result = measureEffectiveness({ session: {
    startsAt: at(SESSION_DAY),
    attendance: attendees.map((student) => ({ student, status: 'attended' })),
  }, snapshots: rows, now: NOW });

  assert.equal(result.attendees.medianDelta, 5, 'one transformed student is not the session');
  assert.equal(result.attendees.meanDelta, 16);
});

/**
 * A DSA bootcamp that lifts overall readiness while leaving coding flat did
 * not do what it said — it is taking credit for a gain from elsewhere.
 */
test('the targeted component is measured separately from the overall score', () => {
  const { session, snapshots: rows } = scenario({
    attendeeGain: 15,
    othersGain: 5,
    targetComponent: 'coding',
    components: { coding: 30 },
  });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.targetComponent.key, 'coding');
  assert.equal(result.targetComponent.label, 'Coding');
  assert.equal(result.targetComponent.attendeeDelta, 30);
  assert.equal(result.targetComponent.comparisonDelta, 0);
  assert.equal(result.targetComponent.lift, 30);
});

test('a session claiming a component it did not move is caught', () => {
  const { session, snapshots: rows } = scenario({
    attendeeGain: 15,
    othersGain: 5,
    targetComponent: 'coding',
    // Overall readiness rose, but the component the session promised did not.
    components: { resume: 40, coding: 0 },
  });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.lift, 10, 'overall readiness did move');
  assert.equal(
    result.targetComponent.lift,
    0,
    'but not the thing the bootcamp said it would teach',
  );
});

test('a session with no declared target reports no component breakdown', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 15, othersGain: 5 });

  assert.equal(measureEffectiveness({ session, snapshots: rows, now: NOW }).targetComponent, null);
});

test('cost per readiness point is reported when both are known', () => {
  const { session, snapshots: rows } = scenario({
    attendeeGain: 20,
    othersGain: 10,
    attendees: 5,
    cost: 50_000,
  });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.cost.total, 50_000);
  assert.equal(result.cost.perAttendee, 10_000);
  assert.equal(result.cost.perPoint, 1000, '₹10,000 per head for 10 points of lift');
});

test('cost per point is withheld when the training beat nothing', () => {
  const { session, snapshots: rows } = scenario({
    attendeeGain: 5,
    othersGain: 10,
    cost: 50_000,
  });

  const result = measureEffectiveness({ session, snapshots: rows, now: NOW });

  assert.equal(result.cost.perAttendee, 10_000);
  assert.equal(result.cost.perPoint, null, 'dividing a cost by a negative lift means nothing');
});

test('a free session reports no cost block rather than zeroes', () => {
  const { session, snapshots: rows } = scenario({ attendeeGain: 20, othersGain: 10 });

  assert.equal(measureEffectiveness({ session, snapshots: rows, now: NOW }).cost, null);
});

test('a session nobody attended is refused rather than crashing', () => {
  const result = measureEffectiveness({
    session: { startsAt: at(SESSION_DAY), attendance: [] },
    snapshots: [],
    now: NOW,
  });

  assert.equal(result.measurable, false);
  assert.equal(result.attended, 0);
  assert.equal(result.lift, null);
});

test('a populated student object resolves to the same person as a raw id', () => {
  const attendees = [id(), id(), id()];
  const others = [id(), id(), id()];

  const result = measureEffectiveness({
    session: {
      startsAt: at(SESSION_DAY),
      // populate() on the way in must not orphan attendees into the
      // comparison group, which would erase the lift entirely.
      attendance: attendees.map((student) => ({
        student: { _id: student, name: 'Student' },
        status: 'attended',
      })),
    },
    snapshots: [
      ...attendees.flatMap((user) => snapshots(user, 40, 60)),
      ...others.flatMap((user) => snapshots(user, 40, 45)),
    ],
    now: NOW,
  });

  assert.equal(result.attendees.measured, 3);
  assert.equal(result.lift, 15);
});

test('attendance summary counts the roll rather than estimating it', () => {
  const summary = attendanceSummary({
    attendance: [
      { student: id(), status: 'attended' },
      { student: id(), status: 'attended' },
      { student: id(), status: 'absent' },
      { student: id(), status: 'registered' },
    ],
  });

  assert.equal(summary.registered, 4);
  assert.equal(summary.attended, 2);
  assert.equal(summary.absent, 1);
  assert.equal(summary.rate, 50);
});

test('an empty roll reports a zero rate rather than dividing by zero', () => {
  assert.equal(attendanceSummary({}).rate, 0);
  assert.equal(attendanceSummary({ attendance: [] }).rate, 0);
});

test('a session requires a title and both ends of its time', () => {
  const error = new Training({}).validateSync();

  assert.ok(error.errors.title);
  assert.ok(error.errors.startsAt);
  assert.ok(error.errors.endsAt);
});

test('a session cannot end before it starts', () => {
  const session = new Training({
    title: 'Backwards',
    startsAt: at('2026-03-01T17:00:00Z'),
    endsAt: at('2026-03-01T09:00:00Z'),
  });

  assert.ok(session.validateSync().errors.endsAt);
});

test('a session rejects a target component that is not a readiness component', () => {
  const session = new Training({
    title: 'Vibes workshop',
    startsAt: at(SESSION_DAY),
    endsAt: at(SESSION_DAY),
    targetComponent: 'enthusiasm',
  });

  assert.ok(session.validateSync(), 'effectiveness can only check what readiness measures');
});

test('attendance counts are derived, so they cannot drift from the roll', () => {
  const session = new Training({
    title: 'DSA bootcamp',
    startsAt: at(SESSION_DAY),
    endsAt: at(SESSION_DAY),
    attendance: [
      { student: id(), status: 'attended' },
      { student: id(), status: 'attended' },
      { student: id(), status: 'absent' },
    ],
  });

  assert.equal(session.attendedCount, 2);
});
