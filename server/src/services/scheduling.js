/**
 * Interview slot generation and clash detection.
 *
 * Kept pure so the two rules that actually cost a student an offer — being
 * given two slots at once, or being told a time that does not exist — are
 * tested directly rather than through the database.
 */

const MINUTE_MS = 60 * 1000;

/**
 * Lays students out across parallel panels.
 *
 * With P panels the first P students are all seen at the start time, the
 * next P one slot later, and so on. Order is preserved from the caller, so
 * a shortlist sorted by match score interviews its strongest candidates
 * first — panels tire, and the order is a real advantage to spend
 * deliberately.
 *
 * @param {object} input
 * @param {Array} input.students Student ids, in the order they should be seen.
 * @param {Date|string|number} input.startsAt When the first slot begins.
 * @param {number} [input.durationMinutes] Length of one interview.
 * @param {number} [input.panels] How many run in parallel.
 * @returns {Array<{student: *, startsAt: Date, endsAt: Date, panel: number}>}
 */
export function generateSlots({ students, startsAt, durationMinutes = 30, panels = 1 }) {
  const duration = Math.max(5, Math.floor(durationMinutes));
  const lanes = Math.max(1, Math.floor(panels));
  const start = new Date(startsAt);

  if (Number.isNaN(start.getTime())) {
    throw new Error('A schedule needs a valid start time.');
  }

  return students.map((student, index) => {
    const round = Math.floor(index / lanes);
    const slotStart = new Date(start.getTime() + round * duration * MINUTE_MS);

    return {
      student,
      startsAt: slotStart,
      endsAt: new Date(slotStart.getTime() + duration * MINUTE_MS),
      // 1-indexed because it is shown to people, not used as an array index.
      panel: (index % lanes) + 1,
    };
  });
}

/** True when two half-open intervals overlap. Touching ends do not clash. */
export function overlaps(a, b) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Every student who has been given two slots at the same time.
 *
 * Across events, not within one: the realistic failure is a student
 * shortlisted by two companies visiting on the same morning, which no single
 * event can notice on its own.
 *
 * @param {Array} events Events carrying `slots` with `student` and times.
 * @returns {Array<{student: string, a: object, b: object}>}
 */
export function findSlotConflicts(events) {
  const byStudent = new Map();

  for (const event of events) {
    for (const slot of event.slots ?? []) {
      // A cancelled slot is not a commitment, so it cannot clash with one.
      if (slot.status === 'cancelled') continue;

      const key = String(slot.student?._id ?? slot.student);
      if (!key || key === 'undefined') continue;

      const entry = {
        eventId: String(event._id ?? ''),
        eventTitle: event.title,
        company: event.company ?? '',
        student: slot.student,
        startsAt: new Date(slot.startsAt),
        endsAt: new Date(slot.endsAt ?? slot.startsAt),
        panel: slot.panel ?? null,
      };

      byStudent.set(key, [...(byStudent.get(key) ?? []), entry]);
    }
  }

  const conflicts = [];

  for (const [student, slots] of byStudent) {
    if (slots.length < 2) continue;

    const sorted = [...slots].sort((a, b) => a.startsAt - b.startsAt);

    // Sorted by start, so each slot only needs checking against the ones that
    // start before it end — but a long slot can span several short ones, so
    // the inner loop runs until the starts are clear of the current end.
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        if (sorted[j].startsAt >= sorted[i].endsAt) break;
        if (overlaps(sorted[i], sorted[j])) {
          conflicts.push({ student, a: sorted[i], b: sorted[j] });
        }
      }
    }
  }

  return conflicts;
}

/**
 * One student's agenda: whole events they are invited to, plus their own slot
 * where one has been assigned.
 *
 * A slot time always wins over the event's own start time — being told
 * "the drive starts at 9" when your interview is at 2pm is how students end
 * up waiting five hours in a corridor.
 */
export function agendaFor(studentId, events) {
  const key = String(studentId);

  return events
    .map((event) => {
      const slot = (event.slots ?? []).find(
        (entry) => String(entry.student?._id ?? entry.student) === key,
      );

      if (!slot && event.audience !== 'college') return null;
      if (slot?.status === 'cancelled') return null;

      return {
        _id: event._id,
        title: event.title,
        type: event.type,
        company: event.company,
        venue: slot?.venue || event.venue,
        startsAt: slot?.startsAt ?? event.startsAt,
        endsAt: slot?.endsAt ?? event.endsAt,
        description: event.description,
        // Present only when this student has a personal time, so the client
        // can say "your slot" rather than "the event".
        slot: slot
          ? { startsAt: slot.startsAt, endsAt: slot.endsAt, panel: slot.panel, status: slot.status }
          : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

/**
 * Flags agenda entries that overlap each other.
 *
 * The officer's clash list is not enough on its own — a student who turns up
 * to find they are expected in two rooms at once needed to know the evening
 * before, so the clash is repeated on their own agenda.
 *
 * @param {Array} agenda Output of `agendaFor`, already sorted by start time.
 */
export function markAgendaClashes(agenda) {
  const flagged = agenda.map((entry) => ({
    ...entry,
    startsAt: new Date(entry.startsAt),
    endsAt: new Date(entry.endsAt),
    clashesWith: [],
  }));

  for (let i = 0; i < flagged.length; i += 1) {
    for (let j = i + 1; j < flagged.length; j += 1) {
      if (flagged[j].startsAt >= flagged[i].endsAt) break;
      if (overlaps(flagged[i], flagged[j])) {
        flagged[i].clashesWith.push(flagged[j].title);
        flagged[j].clashesWith.push(flagged[i].title);
      }
    }
  }

  return flagged;
}

/** Groups events into calendar days, keyed YYYY-MM-DD, earliest first. */
export function groupByDay(events) {
  const days = new Map();

  for (const event of events) {
    const date = new Date(event.startsAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = date.toISOString().slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), event]);
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => ({
      day,
      events: items.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    }));
}
