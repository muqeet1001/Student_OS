import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_PROCTORING_WARNINGS,
  recordProctoringViolation,
} from '../src/services/proctoring.js';

function attempt() {
  return {
    status: 'in-progress',
    score: 8,
    percentage: 80,
    passed: true,
    level: 'advanced',
    submittedAt: null,
    proctoring: { warningCount: 0, violations: [], disqualifiedAt: null, reason: '' },
  };
}

function event(eventId, type = 'no-face') {
  return { eventId, type, occurredAt: new Date(), detail: 'test detector evidence' };
}

test('the first confirmed proctoring event warns without changing the score', () => {
  const doc = attempt();
  const result = recordProctoringViolation(doc, event('00000000-0000-4000-8000-000000000001'));

  assert.equal(result.warningCount, 1);
  assert.equal(result.disqualified, false);
  assert.equal(doc.status, 'in-progress');
  assert.equal(doc.score, 8);
});

test('the second confirmed event disqualifies and forces every score signal to zero', () => {
  const doc = attempt();
  recordProctoringViolation(doc, event('00000000-0000-4000-8000-000000000001'));
  const result = recordProctoringViolation(
    doc,
    event('00000000-0000-4000-8000-000000000002', 'multiple-faces'),
  );

  assert.equal(result.warningCount, MAX_PROCTORING_WARNINGS);
  assert.equal(result.disqualified, true);
  assert.equal(doc.status, 'disqualified');
  assert.equal(doc.score, 0);
  assert.equal(doc.percentage, 0);
  assert.equal(doc.passed, false);
  assert.equal(doc.level, 'beginner');
  assert.ok(doc.proctoring.disqualifiedAt);
});

test('retrying the same event id is idempotent and cannot create a second warning', () => {
  const doc = attempt();
  const repeated = event('00000000-0000-4000-8000-000000000001', 'tab-hidden');

  recordProctoringViolation(doc, repeated);
  const result = recordProctoringViolation(doc, repeated);

  assert.equal(result.duplicate, true);
  assert.equal(result.warningCount, 1);
  assert.equal(doc.proctoring.violations.length, 1);
  assert.equal(doc.status, 'in-progress');
});

test('an unknown detector event cannot be written to the audit ledger', () => {
  const doc = attempt();
  assert.throws(
    () => recordProctoringViolation(doc, event('00000000-0000-4000-8000-000000000003', 'guess')),
    /Unknown proctoring violation/,
  );
});

test('a completed attempt cannot receive a late warning', () => {
  const doc = attempt();
  doc.status = 'submitted';
  assert.throws(
    () => recordProctoringViolation(doc, event('00000000-0000-4000-8000-000000000004')),
    /already finished/,
  );
});
