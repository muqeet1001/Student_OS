import assert from 'node:assert/strict';
import test from 'node:test';
import { analyseCohort } from '../src/services/cohortAnalytics.js';

/** Builds a cohort row shaped like loadCohort's output. */
function student(overrides = {}) {
  return {
    _id: Math.random().toString(36).slice(2),
    name: 'Test Student',
    email: 'test@example.com',
    branch: 'Computer Science',
    graduationYear: 2026,
    readiness: 50,
    band: 'progressing',
    solved: 10,
    testsTaken: 1,
    testAverage: 60,
    interviewsCompleted: 1,
    interviewAverage: 60,
    skillCount: 2,
    verifiedSkills: 1,
    components: { profile: 60, coding: 50, tests: 60, interview: 60 },
    profile: { skills: [], projects: [{ title: 'a' }, { title: 'b' }] },
    ...overrides,
  };
}

test('an empty cohort returns zeroes rather than dividing by zero', () => {
  const result = analyseCohort([]);

  assert.equal(result.totals.students, 0);
  assert.equal(result.totals.averageReadiness, 0);
  assert.deepEqual(result.recommendations, []);
});

test('bands are counted and add up to the cohort', () => {
  const cohort = [
    student({ band: 'ready', readiness: 80 }),
    student({ band: 'ready', readiness: 90 }),
    student({ band: 'progressing', readiness: 50 }),
    student({ band: 'at-risk', readiness: 20 }),
  ];

  const result = analyseCohort(cohort);

  assert.equal(result.totals.students, 4);
  assert.equal(result.totals.ready, 2);
  assert.equal(result.totals.atRisk, 1);
  assert.equal(
    result.bands.reduce((sum, band) => sum + band.count, 0),
    4,
    'every student must land in exactly one band',
  );
  assert.equal(result.totals.averageReadiness, 60);
});

test('separates verified skills from ones only claimed', () => {
  const cohort = [
    student({ profile: { skills: [{ name: 'React', verified: true }], projects: [] } }),
    student({ profile: { skills: [{ name: 'React', verified: false }], projects: [] } }),
    student({ profile: { skills: [{ name: 'react.js', verified: false }], projects: [] } }),
    student({ profile: { skills: [], projects: [] } }),
  ];

  const react = analyseCohort(cohort).skills.find((item) => item.skill === 'React');

  assert.equal(react.verified, 1);
  assert.equal(react.declared, 3, 'the alias "react.js" must count toward React');
  assert.equal(react.unproven, 2, 'claimed but never assessed is the gap that matters');
  assert.equal(react.missing, 1);
});

test('recommends a DSA bootcamp only when weak coding is systemic', () => {
  const weak = Array.from({ length: 8 }, () =>
    student({ components: { profile: 60, coding: 10, tests: 60, interview: 60 } }),
  );
  const strong = Array.from({ length: 2 }, () =>
    student({ components: { profile: 60, coding: 90, tests: 60, interview: 60 } }),
  );

  const flagged = analyseCohort([...weak, ...strong]);
  assert.ok(
    flagged.recommendations.some((item) => item.id === 'dsa-bootcamp'),
    '80% weak should trigger a bootcamp',
  );

  const healthy = analyseCohort(
    Array.from({ length: 10 }, () =>
      student({ components: { profile: 60, coding: 85, tests: 60, interview: 60 } }),
    ),
  );
  assert.ok(
    !healthy.recommendations.some((item) => item.id === 'dsa-bootcamp'),
    'a strong cohort must not be told to run remedial training',
  );
});

test('every recommendation carries a headcount, since budgets are argued in people', () => {
  const cohort = Array.from({ length: 10 }, () =>
    student({
      components: { profile: 20, coding: 5, tests: 0, interview: 0 },
      testsTaken: 0,
      interviewsCompleted: 0,
      profile: { skills: [], projects: [] },
    }),
  );

  const { recommendations } = analyseCohort(cohort);

  assert.ok(recommendations.length > 0, 'a cohort this weak needs recommendations');

  for (const item of recommendations) {
    assert.equal(typeof item.affected, 'number');
    assert.ok(item.affected > 0, `${item.id} should name how many students it serves`);
    assert.ok(item.reason, `${item.id} should justify itself`);
    assert.ok(['high', 'medium', 'low'].includes(item.priority));
  }

  // Highest priority first, so the page leads with what matters most.
  const ranks = recommendations.map((item) => ({ high: 0, medium: 1, low: 2 })[item.priority]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), 'results must be sorted by priority');
});

test('department breakdown groups by branch and sorts by readiness', () => {
  const cohort = [
    student({ branch: 'Mechanical', readiness: 30 }),
    student({ branch: 'Computer Science', readiness: 80 }),
    student({ branch: 'Computer Science', readiness: 70 }),
    student({ branch: '', readiness: 40 }),
  ];

  const { departments } = analyseCohort(cohort);

  assert.equal(departments[0].branch, 'Computer Science');
  assert.equal(departments[0].students, 2);
  assert.equal(departments[0].averageReadiness, 75);

  assert.ok(
    departments.some((dept) => dept.branch === 'Unspecified'),
    'students without a branch must still be counted somewhere',
  );
});

/**
 * A field containing a comma or quote silently mis-parses in every
 * spreadsheet unless it is quoted, which would shift every later column.
 */
test('CSV escaping quotes separators, quotes and newlines', () => {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  assert.equal(escape('Priya Raman'), 'Priya Raman');
  assert.equal(escape('Raman, Priya'), '"Raman, Priya"');
  assert.equal(escape('She said "hi"'), '"She said ""hi"""');
  assert.equal(escape('line one\nline two'), '"line one\nline two"');
  assert.equal(escape(null), '');
  assert.equal(escape(undefined), '');
  assert.equal(escape(0), '0', 'zero must not become an empty cell');
});
