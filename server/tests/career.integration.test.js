import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('career');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;
after(() => stopHarness(harness));

const student = makeClient(harness);
const stranger = makeClient(harness);
const staff = makeClient(harness);
const anonymous = makeClient(harness);
const stamp = Date.now();
let studentId;

describe('career lab and public discovery', { skip }, () => {
  test('creates the three roles used by the workflow', async () => {
    const registered = await signUp(student, { name: 'Public Student', email: `public-${stamp}@studentos.test` });
    studentId = registered.data.user._id;
    await signUp(stranger, { name: 'Other Student', email: `public-other-${stamp}@studentos.test` });
    await signUp(staff, { name: 'Placement Staff', email: `public-staff-${stamp}@studentos.test`, role: 'admin' });
  });

  test('a profile is private by default', async () => {
    const res = await anonymous.get(`/profile/public/${studentId}`);
    assert.equal(res.status, 404, JSON.stringify(res.body));
  });

  test('the student can publish without exposing private contact data', async () => {
    const updated = await student.patch('/profile/me', {
      phone: '+91 99999 99999',
      headline: 'Backend developer',
      publicProfile: { enabled: true, openToReferrals: true },
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));

    const visible = await anonymous.get(`/profile/public/${studentId}`);
    assert.equal(visible.status, 200, JSON.stringify(visible.body));
    assert.equal(visible.data.profile.phone, undefined);
    assert.equal(visible.data.profile.headline, 'Backend developer');
  });

  test('a student gets evidence-grounded mentor guidance', async () => {
    const res = await student.post('/career/mentor', { message: 'What should I improve this week?' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.data.answer.length > 20);
    assert.ok(res.data.actions.length >= 1);
  });

  test('a mock interview accepts job-description context', async () => {
    const res = await student.post('/interviews', {
      round: 'technical',
      difficulty: 'medium',
      targetRole: 'Backend Engineer',
      jobDescription: 'Required: JavaScript, Node.js, REST APIs, SQL and data structures.',
      questionCount: 3,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.data.session.progress.total, 3);
    assert.equal(res.data.session.targetRole, 'Backend Engineer');
    assert.equal(res.data.session.jobDescription, undefined, 'the full JD is not repeated into the live client');
  });

  test('placement staff cannot impersonate a student in Career Lab', async () => {
    const res = await staff.post('/career/mentor', { message: 'Plan my week' });
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  test('only placed, opted-in profiles appear in the alumni network', async () => {
    const before = await stranger.get('/career/alumni');
    assert.equal(before.data.alumni.some((item) => item.userId === studentId), false);

    const offer = await staff.post('/offers', {
      student: studentId,
      company: 'Example Systems',
      role: 'Software Engineer',
      status: 'joined',
    });
    assert.equal(offer.status, 201, JSON.stringify(offer.body));

    const after = await stranger.get('/career/alumni');
    assert.equal(after.status, 200, JSON.stringify(after.body));
    assert.equal(after.data.alumni.some((item) => item.userId === studentId), true);
  });

  test('turning the public profile off also removes referral discovery', async () => {
    const updated = await student.patch('/profile/me', { publicProfile: { enabled: false } });
    assert.equal(updated.data.profile.publicProfile.openToReferrals, false);
    assert.equal((await anonymous.get(`/profile/public/${studentId}`)).status, 404);
    const alumni = await stranger.get('/career/alumni');
    assert.equal(alumni.data.alumni.some((item) => item.userId === studentId), false);
  });
});
