/**
 * Did the training actually work?
 *
 * The tempting measure — "attendees gained 12 readiness points" — is
 * worthless on its own. Readiness rises anyway as students keep practising,
 * so any session run during a busy month looks like a triumph. The only
 * honest number is the difference between what attendees gained and what
 * everyone else gained over the same window.
 *
 * Even that is an upper bound, not proof. Students choose whether to attend,
 * and the ones who show up to an 8am Saturday bootcamp are the ones who were
 * going to improve regardless. That caveat is returned with every result
 * rather than buried in a doc comment, because a placement office quoting
 * these numbers to a budget holder needs to be able to defend them.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const COMPONENT_LABELS = {
  skills: 'Skills',
  coding: 'Coding',
  resume: 'Resume',
  interview: 'Interview',
  projects: 'Projects',
};

/**
 * Below this, a group mean is noise. Three students is already generous —
 * it is the floor at which a number stops being one person's good week.
 */
const MIN_GROUP = 3;

const mean = (values) =>
  values.length ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1)) : 0;

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1));
};

/**
 * The student's readiness immediately before the session, and again at the
 * end of the window. Both are required — a delta needs two points, and
 * assuming a missing "before" was zero would manufacture enormous fake gains
 * for anyone who simply had not opened the app yet.
 */
function deltaFor(rows, sessionTime, endTime) {
  let before = null;
  let after = null;

  for (const row of rows) {
    const day = new Date(row.day).getTime();

    if (day <= sessionTime) {
      if (!before || day > new Date(before.day).getTime()) before = row;
    } else if (day <= endTime) {
      if (!after || day > new Date(after.day).getTime()) after = row;
    }
  }

  if (!before || !after) return null;

  const components = {};
  for (const key of Object.keys(COMPONENT_LABELS)) {
    components[key] = (after.components?.[key] ?? 0) - (before.components?.[key] ?? 0);
  }

  return { score: after.score - before.score, components };
}

/**
 * @param {object} input
 * @param {object} input.session Training session with `startsAt` and attendance.
 * @param {Array} input.snapshots Cohort readiness snapshots `{user, day, score, components}`.
 * @param {number} [input.windowDays] How long after the session to look.
 * @param {Date} [input.now] Injected for testing.
 */
export function measureEffectiveness({ session, snapshots = [], windowDays = 30, now = new Date() }) {
  const sessionTime = new Date(session.startsAt).getTime();
  const endTime = sessionTime + windowDays * DAY_MS;

  const attendeeIds = new Set(
    (session.attendance ?? [])
      .filter((entry) => entry.status === 'attended')
      .map((entry) => String(entry.student?._id ?? entry.student)),
  );

  const caveat =
    'Students choose whether to attend, so this compares two groups that were ' +
    'never alike. Treat it as an upper bound on the effect, not proof of it.';

  const base = {
    window: { days: windowDays, from: new Date(sessionTime), to: new Date(endTime) },
    invited: (session.attendance ?? []).length,
    attended: attendeeIds.size,
    caveat,
  };

  // Nothing can be said before the window has run its course. Reporting a
  // half-finished window as a result is how a session gets declared a
  // success in week one.
  if (now.getTime() < endTime) {
    return {
      ...base,
      measurable: false,
      reason: `The ${windowDays}-day window has not closed yet.`,
      attendees: null,
      comparison: null,
      lift: null,
      targetComponent: null,
      cost: null,
    };
  }

  const byStudent = new Map();
  for (const row of snapshots) {
    const key = String(row.user?._id ?? row.user);
    byStudent.set(key, [...(byStudent.get(key) ?? []), row]);
  }

  const attendeeDeltas = [];
  const comparisonDeltas = [];

  for (const [student, rows] of byStudent) {
    const delta = deltaFor(rows, sessionTime, endTime);
    if (!delta) continue;

    (attendeeIds.has(student) ? attendeeDeltas : comparisonDeltas).push(delta);
  }

  const scores = (deltas) => deltas.map((delta) => delta.score);

  const attendees = {
    measured: attendeeDeltas.length,
    meanDelta: mean(scores(attendeeDeltas)),
    medianDelta: median(scores(attendeeDeltas)),
  };

  const comparison = {
    measured: comparisonDeltas.length,
    meanDelta: mean(scores(comparisonDeltas)),
    medianDelta: median(scores(comparisonDeltas)),
  };

  if (attendeeDeltas.length < MIN_GROUP || comparisonDeltas.length < MIN_GROUP) {
    return {
      ...base,
      measurable: false,
      reason:
        attendeeDeltas.length < MIN_GROUP
          ? `Only ${attendeeDeltas.length} attendees have readiness recorded on both sides of the session.`
          : `Only ${comparisonDeltas.length} non-attendees have readiness on both sides, so there is nothing to compare against.`,
      attendees,
      comparison,
      lift: null,
      targetComponent: null,
      cost: null,
    };
  }

  const lift = Number((attendees.meanDelta - comparison.meanDelta).toFixed(1));

  /*
   * The component the session claimed to move. A DSA bootcamp that lifts
   * overall readiness while leaving the coding component flat did not do what
   * it said it would — the gain came from somewhere else, and the session is
   * taking credit for it.
   */
  let targetComponent = null;
  if (session.targetComponent && COMPONENT_LABELS[session.targetComponent]) {
    const key = session.targetComponent;
    const attendeeDelta = mean(attendeeDeltas.map((delta) => delta.components[key]));
    const comparisonDelta = mean(comparisonDeltas.map((delta) => delta.components[key]));

    targetComponent = {
      key,
      label: COMPONENT_LABELS[key],
      attendeeDelta,
      comparisonDelta,
      lift: Number((attendeeDelta - comparisonDelta).toFixed(1)),
    };
  }

  // What a point of readiness cost, which is the number that survives
  // contact with a procurement conversation about an external trainer.
  let cost = null;
  if (typeof session.cost === 'number' && session.cost > 0) {
    const perAttendee = attendeeIds.size ? Math.round(session.cost / attendeeIds.size) : null;
    cost = {
      total: session.cost,
      perAttendee,
      // Only meaningful when the training actually beat doing nothing.
      perPoint: lift > 0 && perAttendee ? Math.round(perAttendee / lift) : null,
    };
  }

  return {
    ...base,
    measurable: true,
    reason: null,
    attendees,
    comparison,
    lift,
    // Stated plainly so nobody has to infer it from a negative number.
    verdict: lift > 2 ? 'positive' : lift < -2 ? 'negative' : 'inconclusive',
    targetComponent,
    cost,
  };
}

/** Attendance rate, which is a fact about the session rather than an estimate. */
export function attendanceSummary(session) {
  const attendance = session.attendance ?? [];
  const attended = attendance.filter((entry) => entry.status === 'attended').length;

  return {
    registered: attendance.length,
    attended,
    absent: attendance.filter((entry) => entry.status === 'absent').length,
    rate: attendance.length ? Math.round((attended / attendance.length) * 100) : 0,
  };
}

export const __testing = { MIN_GROUP, COMPONENT_LABELS };
