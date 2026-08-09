import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPrompt,
  candidateFindings,
  validateInsight,
} from '../src/services/placementInsights.js';

const ANALYTICS = {
  totals: { students: 120, ready: 30, progressing: 60, atRisk: 30, averageReadiness: 54 },
  departments: [
    { branch: 'Computer Science', students: 60, averageReadiness: 62, ready: 20, atRisk: 10 },
    { branch: 'Mechanical', students: 60, averageReadiness: 46, ready: 10, atRisk: 20 },
  ],
  recommendations: [
    {
      id: 'dsa-bootcamp',
      title: 'Run a DSA bootcamp',
      reason: '48% of students have solved almost nothing.',
      affected: 58,
      priority: 'high',
    },
    {
      id: 'interview-workshop',
      title: 'Run a mock interview workshop',
      reason: '41 students have never completed a practice interview.',
      affected: 41,
      priority: 'medium',
    },
  ],
};

const RECRUITERS = {
  responses: 5,
  rating: { average: 3.4, median: 4, lowest: 2, highest: 5 },
  gaps: [
    { key: 'communication', label: 'Communication', recruiters: 4, companies: ['Infosys', 'TCS', 'Zoho', 'Wipro'] },
    { key: 'dsa', label: 'Data structures & algorithms', recruiters: 2, companies: ['Infosys', 'Zoho'] },
    { key: 'resume', label: 'Resume quality', recruiters: 1, companies: ['Wipro'] },
  ],
  strengths: [],
};

const PLACEMENT = {
  totals: { students: 120, placed: 62, placementRate: 52, offers: 71, offersPerPlacedStudent: 1.15 },
  salary: { median: 650_000, highest: 1_800_000, average: 720_000, reported: 71 },
};

test('candidate findings combine internal analysis and recruiter feedback', () => {
  const findings = candidateFindings({ analytics: ANALYTICS, recruiters: RECRUITERS });
  const ids = findings.map((finding) => finding.id);

  assert.ok(ids.includes('dsa-bootcamp'));
  assert.ok(ids.includes('recruiter-communication'));
  assert.ok(
    !ids.includes('recruiter-resume'),
    'one recruiter naming a gap is an anecdote, not a cohort finding',
  );
});

test('the prompt carries the computed figures rather than raw documents', () => {
  const prompt = buildPrompt({ analytics: ANALYTICS, placement: PLACEMENT, recruiters: RECRUITERS });

  assert.match(prompt, /Students: 120/);
  assert.match(prompt, /Average readiness: 54%/);
  assert.match(prompt, /Placed 62 of 120 \(52%\)/);
  assert.match(prompt, /4 recruiters named "Communication"/);
  assert.match(prompt, /dsa-bootcamp/, 'the candidate ids must be offered explicitly');
});

test('the prompt survives missing optional sections', () => {
  const prompt = buildPrompt({ analytics: ANALYTICS });

  assert.match(prompt, /Students: 120/);
  assert.ok(!prompt.includes('Placements so far'));
  assert.ok(!prompt.includes('What recruiters said'));
});

/**
 * The guard the whole design rests on: a recommendation the model invented
 * cannot reach the page, because only known ids survive.
 */
test('an invented recommendation is discarded', () => {
  const findings = candidateFindings({ analytics: ANALYTICS, recruiters: RECRUITERS });

  const insight = validateInsight(
    {
      headline: 'The cohort is behind.',
      priorities: [
        { id: 'dsa-bootcamp', why: 'It affects the most students.' },
        { id: 'hire-more-trainers', why: 'The model made this up.' },
        { id: 'buy-a-leetcode-licence', why: 'And this.' },
      ],
    },
    findings,
  );

  assert.deepEqual(
    insight.priorities.map((entry) => entry.id),
    ['dsa-bootcamp'],
  );
});

test('the wording of an action comes from the deterministic finding, not the model', () => {
  const findings = candidateFindings({ analytics: ANALYTICS, recruiters: RECRUITERS });

  const insight = validateInsight(
    {
      priorities: [
        {
          id: 'dsa-bootcamp',
          title: 'Fire the faculty',
          reason: '90% of students are hopeless.',
          affected: 9999,
          why: 'Because it is the biggest gap.',
        },
      ],
    },
    findings,
  );

  const [priority] = insight.priorities;

  assert.equal(priority.title, 'Run a DSA bootcamp', 'the title is ours');
  assert.equal(priority.reason, '48% of students have solved almost nothing.', 'the reason is ours');
  assert.equal(priority.affected, 58, 'the model cannot restate a count');
  assert.equal(priority.why, 'Because it is the biggest gap.', 'only the ordering rationale is its own');
});

test('a repeated priority is listed once', () => {
  const findings = candidateFindings({ analytics: ANALYTICS, recruiters: RECRUITERS });

  const insight = validateInsight(
    {
      priorities: [
        { id: 'dsa-bootcamp', why: 'first' },
        { id: 'dsa-bootcamp', why: 'again' },
        { id: 'interview-workshop', why: 'second' },
      ],
    },
    findings,
  );

  assert.deepEqual(
    insight.priorities.map((entry) => entry.id),
    ['dsa-bootcamp', 'interview-workshop'],
  );
});

test('priorities are capped, so the page cannot become a wall of everything', () => {
  const findings = Array.from({ length: 12 }, (_, index) => ({
    id: `finding-${index}`,
    title: `Finding ${index}`,
    reason: 'reason',
  }));

  const insight = validateInsight(
    { priorities: findings.map((finding) => ({ id: finding.id, why: 'x' })) },
    findings,
  );

  assert.equal(insight.priorities.length, 5);
});

test('malformed model output degrades to empty rather than throwing', () => {
  const findings = candidateFindings({ analytics: ANALYTICS, recruiters: RECRUITERS });

  for (const payload of [{}, { priorities: null }, { priorities: 'nope' }, { priorities: [null, 3, 'x'] }]) {
    const insight = validateInsight(payload, findings);

    assert.deepEqual(insight.priorities, [], JSON.stringify(payload));
    assert.equal(insight.headline, null);
  }
});

test('prose is trimmed and length-capped', () => {
  const insight = validateInsight(
    {
      headline: `  ${'h'.repeat(500)}  `,
      summary: 'A real summary.',
      watch: '   ',
      priorities: [],
    },
    [],
  );

  assert.equal(insight.headline.length, 200);
  assert.equal(insight.summary, 'A real summary.');
  assert.equal(insight.watch, null, 'whitespace is not a sentence');
});

test('the result is marked as generated, so the page can label it', () => {
  // A reader has to be able to tell which sentences a model wrote.
  assert.equal(validateInsight({}, []).generated, true);
});
