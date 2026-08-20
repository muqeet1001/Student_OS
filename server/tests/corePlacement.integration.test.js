import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('core-placement');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;
after(() => stopHarness(harness));

const staff = makeClient(harness);
const first = makeClient(harness);
const second = makeClient(harness);
const stamp = Date.now();
let firstId;
let secondId;
let driveId;

describe('connected placement operating system', { skip }, () => {
  test('creates a placement officer and an eligible cohort', async () => {
    await signUp(staff, { name: 'Core Placement Officer', email: `core-staff-${stamp}@studentos.test`, role: 'admin' });
    const a = await signUp(first, { name: 'Eligible Student', email: `core-a-${stamp}@studentos.test` });
    const b = await signUp(second, { name: 'Developing Student', email: `core-b-${stamp}@studentos.test` });
    firstId = a.data.user._id;
    secondId = b.data.user._id;

    await first.patch('/profile/me', { branch: 'Computer Science', graduationYear: 2027, cgpa: 8.4 });
    await second.patch('/profile/me', { branch: 'Mechanical', graduationYear: 2027, cgpa: 6.5 });
    await first.post('/profile/me/skills', { name: 'Java', category: 'programming', level: 'advanced' });
    await first.post('/profile/me/skills', { name: 'SQL', category: 'database', level: 'intermediate' });
  });

  test('creates a drive, reviews JD rules and explains eligibility', async () => {
    const created = await staff.post('/drives', {
      company: 'Core Systems', role: 'Graduate Engineer', status: 'open',
      description: 'Required: Java and SQL. Minimum CGPA 7.5. CSE graduating 2027.',
      requirements: { branches: ['Computer Science'], minCgpa: 7.5, graduationYear: 2027 },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    driveId = created.data.drive._id;

    const drive = await staff.get(`/drives/${driveId}`);
    assert.equal(drive.status, 200, JSON.stringify(drive.body));
    const eligible = drive.data.candidates.find((candidate) => candidate._id === firstId);
    const blocked = drive.data.candidates.find((candidate) => candidate._id === secondId);
    assert.equal(eligible.eligible, true);
    assert.equal(blocked.eligible, false);
    assert.ok(blocked.match.blockers.length > 0);
  });

  test('moves candidates through the pipeline in bulk with history', async () => {
    const added = await staff.post(`/drives/${driveId}/shortlist`, { studentIds: [firstId, secondId], stage: 'invited' });
    assert.equal(added.status, 200, JSON.stringify(added.body));
    const moved = await staff.patch(`/drives/${driveId}/candidates/stage`, { studentIds: [firstId, secondId], stage: 'assessment', note: 'Assessment link sent' });
    assert.equal(moved.status, 200, JSON.stringify(moved.body));
    assert.equal(moved.data.updated, 2);

    const drive = await staff.get(`/drives/${driveId}`);
    const entry = drive.data.drive.shortlist.find((candidate) => candidate.student === firstId);
    assert.equal(entry.stage, 'assessment');
    assert.deepEqual(entry.stageHistory.map((change) => change.to), ['invited', 'assessment']);
  });

  test('saves live filters and frozen candidate lists', async () => {
    const filter = await staff.post('/admin/students/views', { name: 'Java-ready students', kind: 'filter', filters: { minCgpa: 7.5, skill: 'Java' } });
    assert.equal(filter.status, 201, JSON.stringify(filter.body));
    const list = await staff.post('/admin/students/views', { name: 'Core Systems candidates', kind: 'candidate-list', students: [firstId, secondId], filters: {} });
    assert.equal(list.status, 201, JSON.stringify(list.body));
    const views = await staff.get('/admin/students/views');
    assert.equal(views.data.views.length, 2);
  });

  test('assigns one officer action to a candidate list', async () => {
    const assigned = await staff.post('/journey/actions/bulk', {
      owners: [firstId, secondId], category: 'application', title: 'Complete Core Systems assessment',
      description: 'Submit before the deadline.', priority: 'high', reminderChannels: ['in-app'],
    });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    assert.equal(assigned.data.created, 2);
    assert.ok((await first.get('/journey/action-center')).data.entries.some((entry) => entry.title.includes('Core Systems')));
  });

  test('an offer automatically advances the connected drive pipeline', async () => {
    const offered = await staff.post('/offers', { student: firstId, drive: driveId, company: 'Core Systems', role: 'Graduate Engineer', ctc: 800000 });
    assert.equal(offered.status, 201, JSON.stringify(offered.body));
    let drive = await staff.get(`/drives/${driveId}`);
    assert.equal(drive.data.drive.shortlist.find((candidate) => candidate.student === firstId).stage, 'offered');

    await staff.patch(`/offers/${offered.data.offer._id}`, { status: 'joined' });
    drive = await staff.get(`/drives/${driveId}`);
    assert.equal(drive.data.drive.shortlist.find((candidate) => candidate.student === firstId).stage, 'joined');
  });

  test('advanced cohort filters and the unified record return operational evidence', async () => {
    const filtered = await staff.get('/admin/students?graduationYear=2027&minCgpa=7.5&minReadiness=0&hasProjects=false');
    assert.equal(filtered.status, 200, JSON.stringify(filtered.body));
    assert.ok(filtered.data.students.some((student) => student._id === firstId));
    assert.ok(!filtered.data.students.some((student) => student._id === secondId));

    const record = await staff.get(`/admin/students/${firstId}`);
    assert.equal(record.status, 200, JSON.stringify(record.body));
    assert.equal(record.data.offers.length, 1);
    assert.equal(record.data.pipeline[0].candidate.stage, 'joined');
    assert.ok(record.data.actions.length > 0);
  });
});
