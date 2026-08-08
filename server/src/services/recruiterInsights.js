/**
 * What recruiters actually said about the cohort, turned into something a
 * placement office can act on.
 *
 * The reason this exists: an internal metric saying students are weak at
 * communication is arguable. Six named recruiters saying it is not. Every
 * theme here carries the recruiters who raised it, so a training budget can
 * be argued from the outside view rather than the college's own scoring.
 */

import { FEEDBACK_TAGS } from '../models/Recruiter.js';

const LABELS = new Map(FEEDBACK_TAGS.map((tag) => [tag.key, tag.label]));

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Companies with no visit in this long are stale regardless of stored status. */
const DORMANT_AFTER_MONTHS = 18;

/**
 * Ranks feedback themes across every recruiter.
 *
 * Counted by distinct recruiter, not by feedback entry: a company that
 * visits three times a year would otherwise outvote three companies that
 * visit once, and the loudest relationship is not the broadest signal.
 *
 * @param {Array} recruiters Recruiter documents carrying `feedback`.
 */
export function summariseFeedback(recruiters) {
  const gapCounts = new Map();
  const strengthCounts = new Map();
  const ratings = [];

  const bump = (map, key, recruiter) => {
    const entry = map.get(key) ?? { key, label: LABELS.get(key) ?? key, companies: new Set() };
    entry.companies.add(recruiter.name);
    map.set(key, entry);
  };

  for (const recruiter of recruiters) {
    for (const entry of recruiter.feedback ?? []) {
      if (typeof entry.rating === 'number') ratings.push(entry.rating);

      // Deduped within a recruiter, so one company naming a gap in three
      // separate rounds still counts as one company naming it.
      for (const key of new Set(entry.gaps ?? [])) bump(gapCounts, key, recruiter);
      for (const key of new Set(entry.strengths ?? [])) bump(strengthCounts, key, recruiter);
    }
  }

  const rank = (map) =>
    [...map.values()]
      .map((entry) => ({
        key: entry.key,
        label: entry.label,
        recruiters: entry.companies.size,
        companies: [...entry.companies].sort(),
      }))
      .sort((a, b) => b.recruiters - a.recruiters || a.label.localeCompare(b.label));

  const sorted = [...ratings].sort((a, b) => a - b);

  return {
    responses: ratings.length,
    rating: {
      average: ratings.length
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
        : 0,
      // Median as well, for the same reason as the salary report: one furious
      // or one delighted recruiter should not define the cohort's reputation.
      median: sorted.length
        ? sorted.length % 2
          ? sorted[(sorted.length - 1) / 2]
          : Number(((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1))
        : 0,
      lowest: sorted[0] ?? 0,
      highest: sorted.at(-1) ?? 0,
    },
    gaps: rank(gapCounts),
    strengths: rank(strengthCounts),
  };
}

/**
 * Turns the ranked gaps into training the college can schedule.
 *
 * Mirrors the shape `cohortAnalytics` already produces, so the insights page
 * can show internal and recruiter-sourced recommendations in one list — and
 * a recommendation both agree on is the one to run first.
 *
 * @param {object} summary Output of `summariseFeedback`.
 * @param {number} [minRecruiters] How many companies must name a gap to count.
 */
export function recommendFromFeedback(summary, minRecruiters = 2) {
  return summary.gaps
    .filter((gap) => gap.recruiters >= minRecruiters)
    .map((gap) => ({
      id: `recruiter-${gap.key}`,
      title: `Address ${gap.label.toLowerCase()}`,
      reason: `${gap.recruiters} recruiters named it: ${gap.companies.slice(0, 4).join(', ')}${
        gap.companies.length > 4 ? ` and ${gap.companies.length - 4} more` : ''
      }.`,
      affected: gap.recruiters,
      // Half the responding companies naming the same gap is a reputation
      // problem, not a training preference.
      priority: gap.recruiters >= Math.max(3, summary.responses / 2) ? 'high' : 'medium',
      action: 'Raised by the companies who interviewed your students, not by internal scoring.',
      source: 'recruiter-feedback',
    }));
}

/**
 * Relationship health, derived rather than stored.
 *
 * A stored visit count drifts the moment someone edits a drive, and a CRM
 * that disagrees with the placement report is worse than no CRM.
 *
 * @param {object} recruiter
 * @param {Array} drives Drives for this company.
 * @param {Array} offers Offers made by this company.
 * @param {Date} [now]
 */
export function relationshipHealth(recruiter, { drives = [], offers = [], now = new Date() } = {}) {
  const dated = drives
    .filter((drive) => drive.driveDate)
    .sort((a, b) => new Date(b.driveDate) - new Date(a.driveDate));

  const lastVisit = dated[0]?.driveDate ?? null;
  const monthsSinceLastVisit = lastVisit
    ? Math.floor((now - new Date(lastVisit)) / MONTH_MS)
    : null;

  const shortlisted = drives.reduce((sum, drive) => sum + (drive.shortlist?.length ?? 0), 0);

  // Distinct students, matching the placement report: one student holding
  // two offers from the same company is one hire.
  const hired = new Set(
    offers
      .filter((offer) => ['accepted', 'joined'].includes(offer.status))
      .map((offer) => String(offer.student?._id ?? offer.student)),
  ).size;

  const packages = offers
    .filter((offer) => typeof offer.ctc === 'number' && offer.ctc > 0)
    .map((offer) => offer.ctc);

  return {
    visits: drives.length,
    lastVisit,
    monthsSinceLastVisit,
    shortlisted,
    offers: offers.length,
    hired,
    // How many shortlisted students the company actually took. The number
    // that says whether a visit was worth the day it cost to host.
    conversionRate: shortlisted ? Math.round((hired / shortlisted) * 100) : 0,
    averageCtc: packages.length
      ? Math.round(packages.reduce((sum, value) => sum + value, 0) / packages.length)
      : null,
    /*
     * Derived, not stored: a relationship goes quiet without anyone
     * remembering to change a dropdown, which is exactly when it needs
     * flagging. Never applied to a company already marked lost — that is a
     * decision, not neglect.
     */
    stale:
      recruiter.status !== 'lost' &&
      (monthsSinceLastVisit === null || monthsSinceLastVisit >= DORMANT_AFTER_MONTHS),
  };
}

export const __testing = { DORMANT_AFTER_MONTHS };
