import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('practice');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;
after(() => stopHarness(harness));

const student = makeClient(harness);
const stamp = Date.now();

describe('course taxonomy and the semester practice track', { skip }, () => {
  test('creates a student account', async () => {
    const registered = await signUp(student, { name: 'Track Student', email: `track-${stamp}@studentos.test` });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
  });

  test('the test catalogue carries a subject and level for every paper', async () => {
    const res = await student.get('/tests');
    assert.equal(res.status, 200, JSON.stringify(res.body));

    assert.ok(res.data.meta.subjects.length >= 5, 'catalogue should expose subject facets');
    assert.ok(res.data.tests.length > 0);

    for (const paper of res.data.tests) {
      assert.ok(paper.subject?.id, `${paper.slug} has no subject`);
      assert.ok(paper.subject.label.length > 0);
      assert.ok(paper.level, `${paper.slug} has no level`);
      assert.ok(paper.levelLabel.length > 0);
    }
  });

  test('Aptitude and Databases never share a domain or a subject', async () => {
    const res = await student.get('/tests');
    const bySlug = Object.fromEntries(res.data.tests.map((paper) => [paper.slug, paper]));

    const aptitudeSlugs = ['aptitude-sprint', 'quantitative-aptitude-2', 'logical-reasoning', 'data-interpretation'];
    for (const slug of aptitudeSlugs) {
      assert.equal(bySlug[slug].subject.domain, 'aptitude', `${slug} must stay in Aptitude`);
    }

    const dbms = bySlug['dbms-fundamentals'];
    assert.equal(dbms.subject.id, 'databases', 'DBMS paper must map to the Databases subject');
    assert.equal(dbms.subject.domain, 'cs-core', 'Databases is CS Core, never Aptitude');

    const subjects = res.data.meta.subjects;
    const aptitude = subjects.filter((subject) => subject.domain === 'aptitude').map((subject) => subject.id);
    assert.ok(!aptitude.includes('databases'), 'no Databases subject inside the Aptitude facet');
    assert.ok(!aptitude.includes('os') && !aptitude.includes('networks'), 'no CS-core subjects inside Aptitude');
  });

  test('a student without a semester or graduation year has no track yet', async () => {
    const res = await student.get('/practice/track');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.semester, null);
    assert.equal(res.data.stage, null);
    assert.deepEqual(res.data.countBySubject, []);
  });

  test('onboarding stores the semester and the track follows it', async () => {
    const onboarded = await student.call('PUT', '/journey/onboarding', {
      targetRole: 'software-engineer',
      graduationYear: 2028,
      semester: 5,
      branch: 'CSE',
      placementDate: '2028-05-01',
      weeklyGoal: 5,
      consents: [{ key: 'data-sharing', granted: true }],
    });
    assert.equal(onboarded.status, 200, JSON.stringify(onboarded.body));

    const profile = await student.get('/profile/me');
    assert.equal(profile.data.profile.semester, 5);

    const track = await student.get('/practice/track');
    assert.equal(track.data.semester, 5);
    assert.equal(track.data.stage.id, 'interview-gear', 'semester 5 sits in the interview-gear stage');
    assert.deepEqual(track.data.stage.semesters, [5, 6]);

    assert.ok(track.data.countBySubject.length > 0);
    const quantitative = track.data.countBySubject.find((entry) => entry.subjectId === 'quantitative');
    assert.ok(quantitative, 'track should focus on quantitative aptitude');
    assert.equal(quantitative.tests, 2, 'two quantitative papers exist');
    assert.equal(quantitative.level, 'advanced', 'semester 5 aims quantitative at advanced level');
  });

  test('changing the semester in the profile moves the stage', async () => {
    const updated = await student.patch('/profile/me', { semester: 2 });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.data.profile.semester, 2);

    const track = await student.get('/practice/track');
    assert.equal(track.data.stage.id, 'foundations', 'semester 2 sits in the foundations stage');
    assert.deepEqual(track.data.stage.semesters, [1, 2]);

    const csFoundations = track.data.countBySubject.find((entry) => entry.subjectId === 'cs-foundations');
    assert.ok(csFoundations, 'foundations stage includes the CS foundations warm-up paper');
    assert.equal(csFoundations.level, 'foundation');
  });
});
