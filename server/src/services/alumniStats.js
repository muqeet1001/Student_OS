/**
 * Placement history by graduating batch.
 *
 * The number a college puts on its website is a year-on-year comparison, so
 * the thing that matters most here is refusing to make a dishonest one.
 *
 * A batch that is still being placed will always look worse than a finished
 * one — half its offers have not happened yet. Comparing them produces a
 * "placements are down 40%" headline every October, which is an artefact of
 * the calendar rather than a fact about the students. So an in-progress
 * batch is marked, excluded from the trend, and labelled on the page.
 */

const PLACED_STATUSES = ['accepted', 'joined'];

/** Sorted ascending; callers pass raw package numbers. */
function medianOf(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * @param {object} input
 * @param {Array} input.profiles `{ user, graduationYear, branch }` for every student.
 * @param {Array} input.offers Offer documents.
 * @param {Date} [input.now] Injected for testing.
 */
export function buildAlumniStats({ profiles = [], offers = [], now = new Date() }) {
  const currentYear = now.getFullYear();

  const yearByUser = new Map(
    profiles
      .filter((profile) => profile.graduationYear)
      .map((profile) => [String(profile.user), profile.graduationYear]),
  );

  // Cohort size per year, counted from profiles rather than from offers: a
  // batch's denominator is everyone in it, including the students nobody
  // made an offer to. Counting only students with offers is how a placement
  // rate quietly becomes 100%.
  const cohortSize = new Map();
  for (const year of yearByUser.values()) {
    cohortSize.set(year, (cohortSize.get(year) ?? 0) + 1);
  }

  const byYear = new Map();
  const ensure = (year) => {
    if (!byYear.has(year)) {
      byYear.set(year, {
        graduationYear: year,
        students: cohortSize.get(year) ?? 0,
        offers: 0,
        placedStudents: new Set(),
        packages: [],
        recruiters: new Map(),
      });
    }
    return byYear.get(year);
  };

  for (const year of cohortSize.keys()) ensure(year);

  for (const offer of offers) {
    const studentId = String(offer.student?._id ?? offer.student);
    const year = yearByUser.get(studentId);

    // An offer to someone with no graduation year on file cannot be
    // attributed to a batch. Counting it against every batch, or against the
    // current one, would corrupt exactly the number this page exists for.
    if (!year) continue;

    const entry = ensure(year);
    entry.offers += 1;

    if (PLACED_STATUSES.includes(offer.status)) {
      entry.placedStudents.add(studentId);

      const recruiter = entry.recruiters.get(offer.company) ?? { company: offer.company, hired: new Set() };
      recruiter.hired.add(studentId);
      entry.recruiters.set(offer.company, recruiter);
    }

    if (typeof offer.ctc === 'number' && offer.ctc > 0) entry.packages.push(offer.ctc);
  }

  const years = [...byYear.values()]
    .map((entry) => {
      const placed = entry.placedStudents.size;

      return {
        graduationYear: entry.graduationYear,
        students: entry.students,
        placed,
        placementRate: entry.students ? Math.round((placed / entry.students) * 100) : 0,
        offers: entry.offers,
        salary: {
          median: medianOf(entry.packages),
          highest: entry.packages.length ? Math.max(...entry.packages) : 0,
          average: entry.packages.length
            ? Math.round(entry.packages.reduce((sum, value) => sum + value, 0) / entry.packages.length)
            : 0,
          reported: entry.packages.length,
        },
        topRecruiters: [...entry.recruiters.values()]
          .map((recruiter) => ({ company: recruiter.company, hired: recruiter.hired.size }))
          .sort((a, b) => b.hired - a.hired || a.company.localeCompare(b.company))
          .slice(0, 5),
        /*
         * A batch graduating this year or later is still being placed. Its
         * season is not over, so its numbers are a partial count rather than
         * a result.
         */
        inProgress: entry.graduationYear >= currentYear,
      };
    })
    .sort((a, b) => b.graduationYear - a.graduationYear);

  // Only completed batches can be compared, and a trend needs two of them.
  const completed = years.filter((year) => !year.inProgress);

  const trend =
    completed.length >= 2
      ? {
          from: completed.at(-1).graduationYear,
          to: completed[0].graduationYear,
          placementRateChange: completed[0].placementRate - completed.at(-1).placementRate,
          medianChange: completed[0].salary.median - completed.at(-1).salary.median,
          batches: completed.length,
        }
      : null;

  return {
    years,
    trend,
    /** Said plainly so the page never has to infer why a trend is missing. */
    trendNote:
      trend === null
        ? completed.length === 1
          ? 'One completed batch so far — a trend needs two.'
          : 'No completed batches yet. In-progress batches are excluded, because a season that is still running always looks worse than a finished one.'
        : null,
    totals: {
      batches: years.length,
      completedBatches: completed.length,
      alumniPlaced: completed.reduce((sum, year) => sum + year.placed, 0),
    },
  };
}
