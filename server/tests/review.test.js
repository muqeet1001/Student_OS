import assert from 'node:assert/strict';
import test from 'node:test';

import { completeReviewSchema, requestReviewSchema } from '../src/validators/review.validators.js';

test('review request defaults optional context safely', () => {
  assert.deepEqual(requestReviewSchema.parse({ kind: 'profile' }), {
    kind: 'profile',
    resourceId: '',
    note: '',
  });
});

test('review request rejects unknown kinds and oversized context', () => {
  assert.equal(requestReviewSchema.safeParse({ kind: 'portfolio' }).success, false);
  assert.equal(requestReviewSchema.safeParse({ kind: 'project', note: 'x'.repeat(1001) }).success, false);
});

test('mentor feedback must be actionable and is trimmed', () => {
  assert.equal(completeReviewSchema.safeParse({ feedback: 'Fine' }).success, false);
  assert.equal(
    completeReviewSchema.parse({ feedback: '  Add a result metric to the first bullet.  ' }).feedback,
    'Add a result metric to the first bullet.',
  );
});
