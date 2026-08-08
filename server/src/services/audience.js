/**
 * Who an announcement reaches.
 *
 * Kept pure and tested because this is the one part of the feature that
 * cannot be undone. A wrongly-scoped filter that quietly matches everybody
 * sends a "you have been shortlisted" message to the whole college, and no
 * amount of apologising takes it back.
 *
 * The rule throughout: an audience that cannot be resolved resolves to
 * nobody, never to everybody. Failing closed costs one confused officer;
 * failing open costs the college's credibility.
 */

export const AUDIENCE_TYPES = [
  { key: 'all', label: 'Every student' },
  { key: 'branch', label: 'One department' },
  { key: 'year', label: 'One graduating batch' },
  { key: 'band', label: 'One readiness band' },
  { key: 'drive', label: "A drive's shortlist" },
  { key: 'selected', label: 'Chosen students' },
];

/**
 * @param {object} audience `{ type, branch?, graduationYear?, band?, drive?, students? }`
 * @param {object} pools
 * @param {Array} pools.cohort Rows of `{ _id, name, email, branch, graduationYear, band }`.
 * @param {Array} [pools.driveShortlist] Student ids on the named drive.
 * @returns {{recipients: Array, reason: string|null}}
 */
export function resolveAudience(audience, { cohort = [], driveShortlist = null } = {}) {
  const type = audience?.type;

  const byId = (ids) => {
    const wanted = new Set((ids ?? []).map(String));
    return cohort.filter((student) => wanted.has(String(student._id)));
  };

  switch (type) {
    case 'all':
      return { recipients: cohort, reason: null };

    case 'branch': {
      if (!audience.branch) return { recipients: [], reason: 'No department was chosen.' };
      // Compared case-insensitively but exactly: a "starts with" match would
      // make "Computer Science" also select "Computer Science and Design".
      const wanted = audience.branch.trim().toLowerCase();
      return {
        recipients: cohort.filter((student) => (student.branch ?? '').trim().toLowerCase() === wanted),
        reason: null,
      };
    }

    case 'year': {
      const year = Number(audience.graduationYear);
      if (!Number.isInteger(year)) return { recipients: [], reason: 'No batch was chosen.' };
      return {
        recipients: cohort.filter((student) => student.graduationYear === year),
        reason: null,
      };
    }

    case 'band': {
      if (!audience.band) return { recipients: [], reason: 'No readiness band was chosen.' };
      return { recipients: cohort.filter((student) => student.band === audience.band), reason: null };
    }

    case 'drive': {
      /*
       * A null shortlist means the drive could not be loaded — a deleted
       * drive, a bad id. That is emphatically not the same as a drive with
       * an empty shortlist, and it must never fall through to everybody.
       */
      if (driveShortlist === null) {
        return { recipients: [], reason: 'That drive could not be found.' };
      }
      return { recipients: byId(driveShortlist), reason: null };
    }

    case 'selected': {
      if (!audience.students?.length) return { recipients: [], reason: 'No students were chosen.' };
      return { recipients: byId(audience.students), reason: null };
    }

    default:
      return { recipients: [], reason: 'Unknown audience.' };
  }
}

/** A human description, so the confirm step says who this is about to reach. */
export function describeAudience(audience) {
  switch (audience?.type) {
    case 'all':
      return 'every student';
    case 'branch':
      return audience.branch ? `students in ${audience.branch}` : 'a department';
    case 'year':
      return audience.graduationYear ? `the class of ${audience.graduationYear}` : 'a batch';
    case 'band':
      return `students in the ${audience.band} band`;
    case 'drive':
      return "a drive's shortlist";
    case 'selected':
      return `${audience.students?.length ?? 0} chosen students`;
    default:
      return 'nobody';
  }
}
