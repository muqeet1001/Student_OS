/**
 * Badges, levels and the evidence behind them.
 *
 * Same rule as the roadmap: nothing here is awarded by hand. Every badge
 * reads a number the student earned elsewhere — problems solved, skills
 * verified, interviews sat — so the wall of badges is a summary of the work,
 * not a second thing to grind.
 *
 * Badges come in families rather than as one-off awards. A family has tiers
 * with rising thresholds, which means a student always has a visible next
 * step instead of a binary earned/not-earned that stops motivating the
 * moment it is cleared.
 */

const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

/** Points rise steeply so the last tier of a family outweighs easy breadth. */
const TIER_POINTS = [10, 25, 60, 140, 300];

/**
 * Levels are cumulative points, titled in placement terms rather than
 * arcade ones — the student should read the title as a status, not a score.
 */
const LEVELS = [
  { level: 1, title: 'Getting started', at: 0 },
  { level: 2, title: 'Building basics', at: 60 },
  { level: 3, title: 'Practising', at: 180 },
  { level: 4, title: 'Contender', at: 400 },
  { level: 5, title: 'Interview ready', at: 750 },
  { level: 6, title: 'Placement ready', at: 1200 },
];

/**
 * Each family names the metric it reads so a student can check the claim.
 * `thresholds` are in the metric's own units.
 */
const FAMILIES = [
  {
    key: 'solver',
    label: 'Problem Solver',
    icon: 'code',
    unit: 'problems solved',
    unitOne: 'problem solved',
    to: '/coding-practice',
    thresholds: [1, 10, 25, 50, 100],
    read: (e) => e.solved.total,
  },
  {
    key: 'hard-hitter',
    label: 'Hard Hitter',
    icon: 'bolt',
    unit: 'hard problems solved',
    unitOne: 'hard problem solved',
    to: '/coding-practice',
    thresholds: [1, 5, 15, 30],
    read: (e) => e.solved.hard,
  },
  {
    key: 'consistent',
    label: 'Consistency',
    icon: 'local_fire_department',
    unit: 'day streak',
    to: '/coding-practice',
    thresholds: [3, 7, 30, 100],
    // Longest, not current: a streak already achieved should not be revoked
    // by one bad week, or the badge punishes honesty about time off.
    read: (e) => e.streak.longest,
  },
  {
    key: 'verified',
    label: 'Verified',
    icon: 'verified',
    unit: 'skills verified',
    unitOne: 'skill verified',
    to: '/skills',
    thresholds: [1, 3, 5, 8],
    read: (e) => e.verifiedSkills,
  },
  {
    key: 'tested',
    label: 'Test Taker',
    icon: 'quiz',
    unit: 'skill tests passed',
    unitOne: 'skill test passed',
    to: '/skill-test',
    thresholds: [1, 3, 8],
    read: (e) => e.testsPassed,
  },
  {
    key: 'interviewer',
    label: 'Interview Reps',
    icon: 'psychology',
    unit: 'mock interviews completed',
    unitOne: 'mock interview completed',
    to: '/ai-interview',
    thresholds: [1, 3, 10, 25],
    read: (e) => e.interviewsCompleted,
  },
  {
    key: 'articulate',
    label: 'Articulate',
    icon: 'record_voice_over',
    unit: '% best interview score',
    to: '/ai-interview',
    thresholds: [50, 70, 85],
    read: (e) => e.bestInterviewScore,
  },
  {
    key: 'builder',
    label: 'Builder',
    icon: 'construction',
    unit: 'projects on your profile',
    unitOne: 'project on your profile',
    to: '/profile',
    thresholds: [1, 3, 5],
    read: (e) => e.projects,
  },
  {
    key: 'credentialed',
    label: 'Credentialed',
    icon: 'workspace_premium',
    unit: 'certifications added',
    unitOne: 'certification added',
    to: '/profile',
    thresholds: [1, 3, 5],
    read: (e) => e.certifications,
  },
  {
    key: 'polished',
    label: 'Recruiter Ready',
    icon: 'description',
    unit: '% ATS score',
    to: '/resume-builder',
    thresholds: [50, 70, 85],
    read: (e) => e.atsScore,
  },
  {
    key: 'applicant',
    label: 'In the Race',
    icon: 'send',
    unit: 'applications submitted',
    unitOne: 'application submitted',
    to: '/jobs',
    thresholds: [1, 5, 15, 40],
    read: (e) => e.applications,
  },
];

/** The level a points total lands in, plus what the next one needs. */
export function levelFor(points) {
  const reached = [...LEVELS].reverse().find((entry) => points >= entry.at) ?? LEVELS[0];
  const next = LEVELS.find((entry) => entry.at > points) ?? null;

  return {
    level: reached.level,
    title: reached.title,
    points,
    next: next && {
      level: next.level,
      title: next.title,
      at: next.at,
      remaining: next.at - points,
      // Progress through the current band, not from zero, so the bar moves
      // at a readable rate at every level.
      percentage: Math.round(((points - reached.at) / (next.at - reached.at)) * 100),
    },
  };
}

/**
 * @param {object} evidence Counts already computed elsewhere.
 * @returns {{badges: Array, earned: Array, level: object, totals: object}}
 */
export function buildAchievements(evidence) {
  const badges = FAMILIES.map((family) => {
    const value = Math.max(0, Math.floor(family.read(evidence) ?? 0));

    // The highest threshold cleared, and the first one not yet cleared.
    const tierIndex = family.thresholds.reduce(
      (highest, threshold, index) => (value >= threshold ? index : highest),
      -1,
    );
    const nextThreshold = family.thresholds[tierIndex + 1] ?? null;
    const earned = tierIndex >= 0;

    const points = family.thresholds
      .slice(0, tierIndex + 1)
      .reduce((sum, _, index) => sum + TIER_POINTS[index], 0);

    // Measured from the tier just cleared so the bar restarts each tier.
    const floor = tierIndex >= 0 ? family.thresholds[tierIndex] : 0;

    return {
      key: family.key,
      label: family.label,
      icon: family.icon,
      // Resolved here rather than in the client, so "1 certifications added"
      // cannot reach the page. Families with no singular form (the
      // percentage ones) read the same either way.
      unit: value === 1 && family.unitOne ? family.unitOne : family.unit,
      to: family.to,
      value,
      earned,
      tier: earned ? TIER_NAMES[tierIndex] : null,
      tierIndex,
      maxTier: family.thresholds.length - 1,
      complete: nextThreshold === null,
      next: nextThreshold && {
        tier: TIER_NAMES[tierIndex + 1],
        at: nextThreshold,
        remaining: nextThreshold - value,
        percentage: Math.round(((value - floor) / (nextThreshold - floor)) * 100),
      },
      points,
    };
  });

  const totalPoints = badges.reduce((sum, badge) => sum + badge.points, 0);

  return {
    badges,
    level: levelFor(totalPoints),
    totals: {
      earned: badges.filter((badge) => badge.earned).length,
      families: badges.length,
      // Tiers cleared across every family — the honest "how much have I done"
      // number, since a Diamond in one family is worth more than five Bronzes.
      tiers: badges.reduce((sum, badge) => sum + badge.tierIndex + 1, 0),
      possibleTiers: badges.reduce((sum, badge) => sum + badge.maxTier + 1, 0),
      points: totalPoints,
    },
  };
}

export const __testing = { TIER_NAMES, TIER_POINTS, LEVELS, FAMILIES };
