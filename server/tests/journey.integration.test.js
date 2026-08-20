import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('journey');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;
after(() => stopHarness(harness));

const student = makeClient(harness);
const other = makeClient(harness);
const staff = makeClient(harness);
const publicVisitor = makeClient(harness);
const stamp = Date.now();
let studentId;
let actionId;
let appointmentId;

describe('placement journey', { skip }, () => {
  test('creates student and staff accounts', async () => {
    const registered = await signUp(student, { name: 'Journey Student', email: `journey-${stamp}@studentos.test` });
    await signUp(other, { name: 'Other Student', email: `journey-other-${stamp}@studentos.test` });
    await signUp(staff, { name: 'Journey Staff', email: `journey-staff-${stamp}@studentos.test`, role: 'admin' });
    studentId = registered.data.user._id;
  });

  test('starts with an explicit incomplete onboarding state', async () => {
    const res = await student.get('/journey');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.journey.onboardingComplete, false);
    assert.deepEqual(res.data.journey.consents, []);
  });

  test('completes onboarding and records current consent', async () => {
    const res = await student.call('PUT', '/journey/onboarding', {
      targetRole: 'software-engineer', graduationYear: 2027, branch: 'CSE',
      placementDate: '2027-01-15', weeklyGoal: 5, targetCompanies: ['Acme'],
      consents: [{ key: 'data-sharing', granted: true }],
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const journey = await student.get('/journey');
    assert.equal(journey.data.journey.onboardingComplete, true);
    assert.equal(journey.data.journey.consents[0].key, 'data-sharing');
  });

  test('external reminder choices automatically create a consent audit entry', async () => {
    const saved = await student.patch('/journey/preferences', { channels: { email: true, whatsapp: true } });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const journey = await student.get('/journey');
    assert.equal(journey.data.journey.consents.find((item) => item.key === 'email').granted, true);
    assert.equal(journey.data.journey.consents.find((item) => item.key === 'whatsapp').granted, true);
  });

  test('staff assigns an action and only its owner sees it', async () => {
    const assigned = await staff.post('/journey/actions', {
      owner: studentId, category: 'preparation', title: 'Finish one mock interview',
      dueAt: '2026-12-01', link: '/ai-interview', reminderChannels: ['in-app', 'email', 'whatsapp'],
    });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    actionId = assigned.data.action._id;
    assert.equal(assigned.data.delivery.find((item) => item.channel === 'in-app').status, 'recorded');
    assert.equal(assigned.data.delivery.find((item) => item.channel === 'email').status, 'skipped');
    assert.equal(assigned.data.delivery.find((item) => item.channel === 'whatsapp').status, 'skipped');

    const mine = await student.get('/journey/action-center');
    const someoneElse = await other.get('/journey/action-center');
    assert.ok(mine.data.entries.some((entry) => entry.id === `action:${actionId}`));
    assert.ok(!someoneElse.data.entries.some((entry) => entry.id === `action:${actionId}`));
  });

  test('student can close an assigned action but cannot read another owner action', async () => {
    const closed = await student.patch(`/journey/actions/${actionId}`, { status: 'done' });
    assert.equal(closed.status, 200, JSON.stringify(closed.body));
    assert.equal(closed.data.action.status, 'done');
    assert.equal((await other.patch(`/journey/actions/${actionId}`, { status: 'done' })).status, 404);
  });

  test('student requests mentoring and staff schedules it', async () => {
    const requested = await student.post('/journey/mentoring', { mentorName: 'Alumni Mentor', topic: 'Backend interview plan' });
    assert.equal(requested.status, 201, JSON.stringify(requested.body));
    appointmentId = requested.data.appointment._id;

    assert.equal((await student.patch(`/journey/mentoring/${appointmentId}`, { status: 'scheduled' })).status, 403);
    const scheduled = await staff.patch(`/journey/mentoring/${appointmentId}`, { status: 'scheduled', startsAt: '2026-12-02T10:00:00Z' });
    assert.equal(scheduled.status, 200, JSON.stringify(scheduled.body));
    assert.equal(scheduled.data.appointment.status, 'scheduled');
  });

  test('only staff can change institution rules', async () => {
    const body = { readinessWeights: { skills: 20, coding: 30, resume: 20, interview: 20, projects: 10 } };
    assert.equal((await student.patch('/journey/institution', body)).status, 403);
    assert.equal((await staff.patch('/journey/institution', body)).status, 200);
  });

  test('student, staff and benchmark surfaces use the same readiness score', async () => {
    const dashboard = await student.get('/dashboard');
    const cohort = await staff.get(`/admin/students?search=${encodeURIComponent(`journey-${stamp}@studentos.test`)}`);
    const benchmarks = await student.get('/journey/benchmarks');
    assert.equal(cohort.status, 200, JSON.stringify(cohort.body));
    assert.equal(cohort.data.students[0].readiness, dashboard.data.readiness.score);
    assert.equal(benchmarks.data.myScore, dashboard.data.readiness.score);
  });

  test('recruiter feedback link is public, structured and genuinely one-use', async () => {
    const recruiter = await staff.post('/recruiters', { name: `Journey Recruiter ${stamp}`, status: 'active' });
    const invite = await staff.post(`/recruiters/${recruiter.data.recruiter._id}/portal-invite`);
    assert.equal(invite.status, 201, JSON.stringify(invite.body));
    const token = invite.data.path.split('/').at(-1);
    const viewed = await publicVisitor.get(`/recruiter-portal/${token}`);
    assert.equal(viewed.status, 200, JSON.stringify(viewed.body));
    assert.equal(viewed.data.company, `Journey Recruiter ${stamp}`);
    const submitted = await publicVisitor.post(`/recruiter-portal/${token}`, {
      rating: 4, strengths: ['projects'], gaps: ['communication'], notes: 'Strong evidence; make outcomes more concise.',
    });
    assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
    assert.equal((await publicVisitor.post(`/recruiter-portal/${token}`, { rating: 4 })).status, 404);
  });

  test('calendar export is a downloadable standard calendar', async () => {
    const res = await fetch(`${harness.base}/journey/calendar.ics`, {
      headers: { Authorization: `Bearer ${student.state.token}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/calendar/);
    assert.match(await res.text(), /BEGIN:VCALENDAR/);
  });
});
