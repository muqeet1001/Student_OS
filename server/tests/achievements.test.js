import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAchievements, levelFor, __testing } from '../src/services/achievements.js';

const { TIER_NAMES, TIER_POINTS, LEVELS, FAMILIES } = __testing;

/** A student who has done nothing at all. */
const NOTHING = {
  solved: { easy: 0, medium: 0, hard: 0, total: 0 },
  streak: { current: 0, longest: 0 },
  verifiedSkills: 0,
  testsPassed: 0,
  interviewsCompleted: 0,
  bestInterviewScore: 0,
  projects: 0,
  certifications: 0,
  atsScore: 0,
  applications: 0,
};

const evidence = (overrides) => ({ ...NOTHING, ...overrides });
const badge = (result, key) => result.badges.find((entry) => entry.key === key);

test('a student with no evidence earns nothing and starts at level 1', () => {
  const result = buildAchievements(NOTHING);

  assert.equal(result.totals.earned, 0);
  assert.equal(result.totals.points, 0);
  assert.equal(result.level.level, 1);
  assert.ok(
    result.badges.every((entry) => entry.earned === false && entry.tier === null),
    'nothing is awarded for signing up',
  );
});

test('every family still reports a next tier when nothing is earned', () => {
  // A locked badge with no target tells the student nothing about how to earn it.
  const result = buildAchievements(NOTHING);

  for (const entry of result.badges) {
    assert.ok(entry.next, `${entry.key} should point at its first tier`);
    assert.equal(entry.next.tier, 'Bronze');
    assert.equal(entry.next.remaining, entry.next.at, 'from zero, the gap is the threshold');
  }
});

test('a badge is earned the moment its first threshold is met, not passed', () => {
  const atThreshold = buildAchievements(evidence({ solved: { ...NOTHING.solved, total: 1 } }));
  const below = buildAchievements(NOTHING);

  assert.equal(badge(atThreshold, 'solver').earned, true, 'the threshold is inclusive');
  assert.equal(badge(atThreshold, 'solver').tier, 'Bronze');
  assert.equal(badge(below, 'solver').earned, false);
});

test('a badge reports the highest tier cleared, not the first', () => {
  // 60 solved clears 1, 10, 25 and 50 — that is Platinum, not Bronze.
  const result = buildAchievements(evidence({ solved: { ...NOTHING.solved, total: 60 } }));
  const solver = badge(result, 'solver');

  assert.equal(solver.tier, 'Platinum');
  assert.equal(solver.tierIndex, 3);
  assert.equal(solver.next.tier, 'Diamond');
  assert.equal(solver.next.at, 100);
  assert.equal(solver.next.remaining, 40);
});

test('points accumulate across every tier cleared, not just the highest', () => {
  const result = buildAchievements(evidence({ solved: { ...NOTHING.solved, total: 25 } }));
  const solver = badge(result, 'solver');

  // Bronze + Silver + Gold.
  assert.equal(solver.points, TIER_POINTS[0] + TIER_POINTS[1] + TIER_POINTS[2]);
});

test('clearing the last tier marks the family complete with no next target', () => {
  const result = buildAchievements(evidence({ solved: { ...NOTHING.solved, total: 500 } }));
  const solver = badge(result, 'solver');

  assert.equal(solver.complete, true);
  assert.equal(solver.next, null);
  assert.equal(solver.tier, 'Diamond');
  assert.equal(solver.tierIndex, solver.maxTier);
});

test('tier progress restarts at each tier instead of measuring from zero', () => {
  // 30 solved sits between the 25 and 50 thresholds: a fifth of the way.
  const solver = badge(
    buildAchievements(evidence({ solved: { ...NOTHING.solved, total: 30 } })),
    'solver',
  );

  assert.equal(solver.next.percentage, 20, '(30-25)/(50-25)');
  assert.ok(
    solver.next.percentage > 0 && solver.next.percentage < 100,
    'a bar pinned near 100% the whole way up a tier reads as stuck',
  );
});

/**
 * A streak already achieved should not be revoked by one bad week, or the
 * badge quietly punishes a student for taking exams.
 */
test('the streak badge reads the longest run, not the current one', () => {
  const result = buildAchievements(evidence({ streak: { current: 0, longest: 30 } }));
  const consistency = badge(result, 'consistent');

  assert.equal(consistency.earned, true);
  assert.equal(consistency.value, 30);
  assert.equal(consistency.tier, 'Gold');
});

test('percentage-based families read the score directly', () => {
  const result = buildAchievements(evidence({ atsScore: 72, bestInterviewScore: 86 }));

  assert.equal(badge(result, 'polished').tier, 'Silver', '72 clears 50 and 70');
  assert.equal(badge(result, 'articulate').tier, 'Gold', '86 clears 50, 70 and 85');
});

test('the best interview score is used, so one weak rehearsal cannot demote a badge', () => {
  const result = buildAchievements(evidence({ interviewsCompleted: 4, bestInterviewScore: 88 }));

  assert.equal(badge(result, 'articulate').tier, 'Gold');
  assert.equal(badge(result, 'interviewer').tier, 'Silver', '4 interviews clears 1 and 3');
});

test('a missing or negative metric is floored rather than throwing', () => {
  // Defensive: an aggregation that returns nothing must not produce NaN tiers.
  const result = buildAchievements(evidence({ atsScore: undefined, projects: -2 }));

  assert.equal(badge(result, 'polished').value, 0);
  assert.equal(badge(result, 'builder').value, 0);
  assert.equal(Number.isFinite(result.totals.points), true);
});

test('a fractional metric does not award a tier it has not reached', () => {
  const result = buildAchievements(evidence({ atsScore: 69.9 }));

  assert.equal(badge(result, 'polished').value, 69);
  assert.equal(badge(result, 'polished').tier, 'Bronze', '69.9 has not cleared 70');
});

test('totals count tiers rather than families, since a Diamond outweighs a Bronze', () => {
  const result = buildAchievements(
    evidence({ solved: { ...NOTHING.solved, total: 100 }, projects: 1 }),
  );

  assert.equal(result.totals.earned, 2, 'two families have something');
  assert.equal(result.totals.tiers, 6, 'five solver tiers plus one builder tier');
  assert.equal(
    result.totals.possibleTiers,
    FAMILIES.reduce((sum, family) => sum + family.thresholds.length, 0),
  );
});

test('level thresholds are ordered, and the first starts at zero', () => {
  assert.equal(LEVELS[0].at, 0, 'a new student must land in a level, not outside every band');

  for (let i = 1; i < LEVELS.length; i += 1) {
    assert.ok(LEVELS[i].at > LEVELS[i - 1].at, `level ${LEVELS[i].level} must need more points`);
    assert.equal(LEVELS[i].level, LEVELS[i - 1].level + 1);
  }
});

test('a points total lands in the highest level it has reached', () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(LEVELS[1].at - 1).level, 1, 'one point short is still the lower level');
  assert.equal(levelFor(LEVELS[1].at).level, 2, 'the threshold is inclusive');
  assert.equal(levelFor(LEVELS.at(-1).at + 5000).level, LEVELS.at(-1).level);
});

test('the top level reports no next target rather than an unreachable one', () => {
  const top = levelFor(LEVELS.at(-1).at);

  assert.equal(top.next, null);
  assert.equal(top.title, LEVELS.at(-1).title);
});

test('level progress measures across the current band, not from zero', () => {
  const band = levelFor(LEVELS[1].at);

  assert.equal(band.next.percentage, 0, 'just arrived at level 2');
  assert.equal(band.next.remaining, LEVELS[2].at - LEVELS[1].at);

  const midway = levelFor(Math.round((LEVELS[1].at + LEVELS[2].at) / 2));
  assert.ok(midway.next.percentage >= 49 && midway.next.percentage <= 51);
});

test('the top level is reachable by a strong but not superhuman student', () => {
  // Guards against thresholds that look motivating and are in fact unwinnable.
  const strong = buildAchievements({
    solved: { easy: 60, medium: 50, hard: 30, total: 140 },
    streak: { current: 12, longest: 45 },
    verifiedSkills: 6,
    testsPassed: 4,
    interviewsCompleted: 12,
    bestInterviewScore: 88,
    projects: 4,
    certifications: 3,
    atsScore: 88,
    applications: 20,
  });

  assert.equal(strong.level.level, LEVELS.at(-1).level, 'this profile should top out');
});

test('a maxed profile does not exceed the defined tier names', () => {
  const maxed = buildAchievements({
    solved: { easy: 999, medium: 999, hard: 999, total: 2997 },
    streak: { current: 400, longest: 400 },
    verifiedSkills: 50,
    testsPassed: 50,
    interviewsCompleted: 100,
    bestInterviewScore: 100,
    projects: 20,
    certifications: 20,
    atsScore: 100,
    applications: 200,
  });

  for (const entry of maxed.badges) {
    assert.ok(TIER_NAMES.includes(entry.tier), `${entry.key} produced an unnamed tier`);
    assert.equal(entry.complete, true);
  }
});

test('every family is well formed: rising thresholds and a tier name per threshold', () => {
  for (const family of FAMILIES) {
    assert.ok(family.thresholds.length > 0, `${family.key} has no tiers`);
    assert.ok(
      family.thresholds.length <= TIER_NAMES.length,
      `${family.key} has more tiers than there are names for`,
    );
    assert.ok(family.unit, `${family.key} must say what it counts`);
    assert.ok(family.to?.startsWith('/'), `${family.key} must link to where it is earned`);

    for (let i = 1; i < family.thresholds.length; i += 1) {
      assert.ok(
        family.thresholds[i] > family.thresholds[i - 1],
        `${family.key} thresholds must rise`,
      );
    }
  }
});

test('a count of one reads in the singular', () => {
  // "1 certifications added" is the kind of thing that makes a product look
  // unfinished, and the client should not have to know about it.
  const result = buildAchievements(evidence({ certifications: 1, projects: 1, applications: 1 }));

  assert.equal(badge(result, 'credentialed').unit, 'certification added');
  assert.equal(badge(result, 'builder').unit, 'project on your profile');
  assert.equal(badge(result, 'applicant').unit, 'application submitted');
});

test('counts other than one stay plural, including zero', () => {
  const none = buildAchievements(NOTHING);
  const many = buildAchievements(evidence({ certifications: 3 }));

  assert.equal(badge(none, 'credentialed').unit, 'certifications added', '"0 certifications"');
  assert.equal(badge(many, 'credentialed').unit, 'certifications added');
});

test('percentage families read the same at every value', () => {
  // "1 % ATS score" needs no singular, and inventing one would read worse.
  const one = buildAchievements(evidence({ atsScore: 1 }));
  const many = buildAchievements(evidence({ atsScore: 80 }));

  assert.equal(badge(one, 'polished').unit, badge(many, 'polished').unit);
});

test('badge keys are unique, so React keys and lookups stay stable', () => {
  const keys = FAMILIES.map((family) => family.key);
  assert.equal(new Set(keys).size, keys.length);
});
