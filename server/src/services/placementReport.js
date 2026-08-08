/**
 * The placement report a college actually publishes.
 *
 * Kept as a pure function over already-loaded documents so the counting rules
 * — which are the part that gets a report disputed — can be tested directly.
 */

/** Offers that count a student as placed. Declined and withdrawn do not. */
export const PLACED_STATUSES = ['accepted', 'joined'];

export const OFFER_STATUSES = ['offered', 'accepted', 'declined', 'joined', 'withdrawn'];

/** The middle value, or the mean of the middle two on an even count. */
function medianOf(sorted) {
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * @param {object} input
 * @param {number} input.totalStudents Size of the cohort the rate is drawn from.
 * @param {Array} input.offers Offer documents (student may be populated or a raw id).
 * @param {Array} input.profiles `{ user, branch }` for the same cohort.
 * @param {number|null} [input.graduationYear] Echoed back so the caller knows the scope.
 */
export function buildPlacementReport({ totalStudents, offers, profiles, graduationYear = null }) {
  // Students are counted distinctly, not offers: one student holding three
  // offers is one placement, and conflating the two is how placement
  // percentages end up above 100.
  const placedStudents = new Set(
    offers
      .filter((offer) => PLACED_STATUSES.includes(offer.status))
      .map((offer) => String(offer.student?._id ?? offer.student)),
  );

  const salaries = offers
    .filter((offer) => typeof offer.ctc === 'number' && offer.ctc > 0)
    .map((offer) => offer.ctc)
    .sort((a, b) => a - b);

  const byCompany = new Map();
  for (const offer of offers) {
    const entry = byCompany.get(offer.company) ?? { company: offer.company, offers: 0, placed: 0 };
    entry.offers += 1;
    if (PLACED_STATUSES.includes(offer.status)) entry.placed += 1;
    byCompany.set(offer.company, entry);
  }

  const byBranch = new Map();
  for (const profile of profiles) {
    const key = profile.branch || 'Unspecified';
    const entry = byBranch.get(key) ?? { branch: key, students: 0, placed: 0 };
    entry.students += 1;
    if (placedStudents.has(String(profile.user))) entry.placed += 1;
    byBranch.set(key, entry);
  }

  return {
    graduationYear,
    totals: {
      students: totalStudents,
      placed: placedStudents.size,
      placementRate: totalStudents ? Math.round((placedStudents.size / totalStudents) * 100) : 0,
      offers: offers.length,
      // Above 1.0 means students are holding multiple offers, which is a
      // healthier signal than the raw placement rate alone.
      offersPerPlacedStudent: placedStudents.size
        ? Number((offers.length / placedStudents.size).toFixed(2))
        : 0,
    },
    salary: {
      highest: salaries.at(-1) ?? 0,
      lowest: salaries[0] ?? 0,
      // Median as well as mean: one outlier package distorts an average badly
      // in a cohort this size, and the median is what students recognise.
      median: medianOf(salaries),
      average: salaries.length
        ? Math.round(salaries.reduce((sum, value) => sum + value, 0) / salaries.length)
        : 0,
      reported: salaries.length,
    },
    statuses: OFFER_STATUSES.map((status) => ({
      status,
      count: offers.filter((offer) => offer.status === status).length,
    })),
    companies: [...byCompany.values()].sort((a, b) => b.placed - a.placed || b.offers - a.offers),
    branches: [...byBranch.values()]
      .map((entry) => ({
        ...entry,
        rate: entry.students ? Math.round((entry.placed / entry.students) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate),
  };
}
