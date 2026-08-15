import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('reviews');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

const student = makeClient(harness);
const otherStudent = makeClient(harness);
const staff = makeClient(harness);
const stamp = Date.now();
let reviewId;

describe('mentor reviews', { skip }, () => {
  test('creates student and staff accounts', async () => {
    await signUp(student, { name: 'Review Student', email: `review-student-${stamp}@studentos.test` });
    await signUp(otherStudent, { name: 'Other Student', email: `review-other-${stamp}@studentos.test` });
    await signUp(staff, { name: 'Career Mentor', email: `review-staff-${stamp}@studentos.test`, role: 'admin' });
  });

  test('validates review types', async () => {
    const res = await student.post('/reviews', { kind: 'everything' });
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  test('a student can request an actionable review', async () => {
    const res = await student.post('/reviews', {
      kind: 'resume',
      resourceId: 'software-engineer-v2',
      note: 'Please check whether the evidence supports my project claims.',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.data.review.status, 'requested');
    reviewId = res.data.review._id;
  });

  test('does not create duplicate open requests', async () => {
    const res = await student.post('/reviews', {
      kind: 'resume',
      resourceId: 'software-engineer-v2',
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
  });

  test('review inboxes are private', async () => {
    const own = await student.get('/reviews/mine');
    const other = await otherStudent.get('/reviews/mine');
    assert.equal(own.status, 200, JSON.stringify(own.body));
    assert.equal(own.data.reviews.length, 1);
    assert.deepEqual(other.data.reviews, []);
  });

  test('students cannot open or complete the staff queue', async () => {
    assert.equal((await student.get('/reviews/queue')).status, 403);
    assert.equal((await student.patch(`/reviews/${reviewId}`, { feedback: 'This is actionable feedback.' })).status, 403);
  });

  test('staff see the request and short feedback is refused', async () => {
    const queue = await staff.get('/reviews/queue');
    assert.equal(queue.status, 200, JSON.stringify(queue.body));
    assert.ok(queue.data.reviews.some((review) => review._id === reviewId));

    const short = await staff.patch(`/reviews/${reviewId}`, { feedback: 'Good.' });
    assert.equal(short.status, 400, JSON.stringify(short.body));
  });

  test('staff feedback closes the loop for the student', async () => {
    const feedback = 'Add the outcome metric to the first project bullet, then remove the unsupported teamwork claim.';
    const completed = await staff.patch(`/reviews/${reviewId}`, { feedback });
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.data.review.status, 'reviewed');

    const own = await student.get('/reviews/mine');
    assert.equal(own.data.reviews[0].feedback, feedback);
    assert.equal(own.data.reviews[0].reviewer.name, 'Career Mentor');
  });
});
