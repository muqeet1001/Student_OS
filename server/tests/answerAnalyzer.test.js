import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreAnswer, summariseSession } from '../src/services/answerAnalyzer.js';

const behavioural = {
  round: 'behavioural',
  keywords: ['conflict', 'deadline', 'team'],
};

const STRONG_ANSWER = `
When our team was two weeks from a release deadline, a conflict came up between
me and another engineer about the caching approach. My task was to get us to a
decision without losing the week. I built a small benchmark of both designs,
shared the numbers, and proposed we ship the simpler one first. As a result we
cut response time by 40% and shipped three days early.
`;

test('rewards a complete STAR answer that covers the keywords', () => {
  const result = scoreAnswer(STRONG_ANSWER, behavioural);

  assert.ok(result.score >= 75, `expected a strong score, got ${result.score}`);
  assert.equal(result.dimensions.coverage, 100);
  assert.ok(result.dimensions.structure >= 75);
  assert.ok(
    result.feedback.some((note) => note.positive && /STAR/.test(note.text)),
    'should confirm the STAR structure',
  );
});

test('penalises a vague answer and says what is missing', () => {
  const result = scoreAnswer('I am a hard worker and a good team player.', behavioural);

  assert.ok(result.score < 45, `expected a weak score, got ${result.score}`);
  assert.ok(
    result.feedback.some((note) => /Quantify/.test(note.text)),
    'should ask for concrete numbers',
  );
  assert.ok(
    result.feedback.some((note) => /Did not touch on/.test(note.text)),
    'should list the uncovered keywords',
  );
});

test('scores an empty answer as zero rather than throwing', () => {
  const result = scoreAnswer('', behavioural);

  assert.equal(result.score, 0);
  assert.deepEqual(result.dimensions, {
    structure: 0,
    specificity: 0,
    coverage: 0,
    delivery: 0,
  });
});

test('does not demand STAR structure on technical rounds', () => {
  const question = { round: 'technical', keywords: ['index'] };
  const answer =
    'First the database checks whether an index covers the query, because a covering index avoids reading the row. Therefore the trade-off is slower writes.';

  const result = scoreAnswer(answer, question);

  assert.ok(result.dimensions.structure >= 60, 'ordered reasoning should score well');
  assert.ok(
    !result.feedback.some((note) => /STAR/.test(note.text)),
    'STAR feedback belongs to narrative rounds only',
  );
});

test('keyword matching is whole-word, so substrings do not count', () => {
  const result = scoreAnswer('We had a rapid rollout.', { round: 'technical', keywords: ['api'] });

  assert.equal(result.dimensions.coverage, 0, '"rapid" must not satisfy the "api" keyword');
});

test('skipped questions still drag the session score down', () => {
  const answered = {
    score: 80,
    skipped: false,
    dimensions: { structure: 80, specificity: 80, coverage: 80, delivery: 80 },
  };
  const skipped = {
    score: 0,
    skipped: true,
    dimensions: { structure: 0, specificity: 0, coverage: 0, delivery: 0 },
  };

  const summary = summariseSession([answered, skipped]);

  assert.equal(summary.overallScore, 40, 'one strong answer out of two averages to 40');
  assert.ok(
    summary.summary.some((line) => /skipped/i.test(line)),
    'should call out the skip',
  );
});

test('a fully skipped session reports zero without dividing by zero', () => {
  const summary = summariseSession([
    { score: 0, skipped: true, dimensions: { structure: 0, specificity: 0, coverage: 0, delivery: 0 } },
  ]);

  assert.equal(summary.overallScore, 0);
  assert.equal(summary.verdict, 'Not attempted');
});
