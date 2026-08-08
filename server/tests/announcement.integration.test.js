import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

/**
 * Announcements against a real database.
 *
 * The part that needs real wiring is the recipient snapshot: it has to be
 * frozen at send time and readable from a student's own inbox afterwards.
 */
const harness = await startHarness('announcements');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

const staff = makeClient(harness);
const cse = makeClient(harness);
const mech = makeClient(harness);

const stamp = Date.now();
let announcementId;

describe('announcements', { skip }, () => {
  test('a cohort with two departments exists', async () => {
    await signUp(staff, {
      name: 'Comms Officer',
      email: `comms${stamp}@studentos.test`,
      role: 'admin',
    });

    await signUp(cse, { name: 'CSE Student', email: `cse${stamp}@studentos.test` });
    await cse.patch('/profile/me', { branch: 'Computer Science', graduationYear: 2026 });

    await signUp(mech, { name: 'Mech Student', email: `mech${stamp}@studentos.test` });
    await mech.patch('/profile/me', { branch: 'Mechanical', graduationYear: 2027 });
  });

  test('the preview counts the audience without sending anything', async () => {
    const res = await staff.post('/announcements/preview', {
      type: 'branch',
      branch: 'Computer Science',
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.count, 1);
    assert.equal(res.data.sample[0].name, 'CSE Student');
    assert.match(res.data.description, /Computer Science/);

    // And nothing was actually created.
    const sent = await staff.get('/announcements');
    assert.equal(sent.data.announcements.length, 0);
  });

  test('SMTP is reported as unavailable rather than silently pretending', async () => {
    const res = await staff.post('/announcements/preview', { type: 'all' });

    assert.equal(res.data.email.available, false);
    assert.match(res.data.email.reason, /SMTP is not configured/);
  });

  /** A mis-built filter is refused, not recorded as a send that reached nobody. */
  test('an audience matching nobody is refused', async () => {
    const res = await staff.post('/announcements', {
      subject: 'Nobody',
      body: 'This should not send.',
      audience: { type: 'branch', branch: 'Astrophysics' },
    });

    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  test('a drive that does not exist reaches nobody rather than everybody', async () => {
    const res = await staff.post('/announcements', {
      subject: 'Ghost drive',
      body: 'Should not reach the college.',
      audience: { type: 'drive', drive: '65f000000000000000000999' },
    });

    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.message, /could not be found/);
  });

  test('sending to one department reaches only that department', async () => {
    const res = await staff.post('/announcements', {
      subject: 'CSE drive on Friday',
      body: 'Report to Block C at 9am.\nBring your ID.',
      audience: { type: 'branch', branch: 'Computer Science' },
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    announcementId = res.data.announcement._id;

    assert.equal(res.data.delivery.total, 1);
    assert.equal(res.data.delivery.sent, 0, 'no SMTP, so nothing was emailed');
    assert.equal(res.data.delivery.skipped, 1, 'and that is recorded honestly');
    assert.equal(res.data.announcement.emailAvailable, false);
  });

  test('the targeted student sees it in their inbox', async () => {
    const res = await cse.get('/announcements/me');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.announcements.length, 1);
    assert.equal(res.data.unread, 1);
    assert.equal(res.data.announcements[0].subject, 'CSE drive on Friday');
    assert.match(res.data.announcements[0].body, /Block C/);
  });

  test('a student outside the audience sees nothing', async () => {
    const res = await mech.get('/announcements/me');

    assert.deepEqual(res.data.announcements, []);
    assert.equal(res.data.unread, 0);
  });

  test('marking it read updates only that student row', async () => {
    const marked = await cse.post(`/announcements/${announcementId}/read`);
    assert.equal(marked.status, 200, JSON.stringify(marked.body));

    const inbox = await cse.get('/announcements/me');
    assert.equal(inbox.data.unread, 0);
    assert.ok(inbox.data.announcements[0].readAt);

    const report = await staff.get('/announcements');
    assert.equal(report.data.announcements[0].delivery.read, 1);
  });

  test('a student who was not a recipient cannot mark it read', async () => {
    const res = await mech.post(`/announcements/${announcementId}/read`);

    assert.equal(res.status, 404);
  });

  /**
   * Recipients are frozen at send time. Re-resolving on read would rewrite
   * history every time someone edited a profile.
   */
  test('changing a branch afterwards does not rewrite who was reached', async () => {
    await cse.patch('/profile/me', { branch: 'Mechanical' });

    const inbox = await cse.get('/announcements/me');
    assert.equal(
      inbox.data.announcements.length,
      1,
      'they were sent it, so they keep it however their profile changes',
    );

    const mechInbox = await mech.get('/announcements/me');
    assert.deepEqual(mechInbox.data.announcements, [], 'and it does not retroactively arrive');
  });

  test('a student cannot send an announcement', async () => {
    const res = await mech.post('/announcements', {
      subject: 'Free pizza',
      body: 'Everyone come to my room.',
      audience: { type: 'all' },
    });

    assert.equal(res.status, 403);
  });

  test('a student cannot read the sent log', async () => {
    const res = await mech.get('/announcements');
    assert.equal(res.status, 403);
  });

  test('sending to everyone reaches the whole cohort', async () => {
    const res = await staff.post('/announcements', {
      subject: 'Orientation',
      body: 'All students, main hall, Monday.',
      audience: { type: 'all' },
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.data.delivery.total, 2, 'both students, not the staff account');
  });
});
