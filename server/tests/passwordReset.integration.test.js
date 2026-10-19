import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { OneTimeToken } from '../src/models/OneTimeToken.js';
import { mailerStatus } from '../src/services/mailer.js';
import { issueResetToken } from '../src/services/passwordReset.js';
import { hashToken } from '../src/services/token.service.js';
import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('pwreset');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;
after(() => stopHarness(harness));

const stamp = Date.now();
const password = 'password123';
const newPassword = 'brandnewpw99';
const email = (label) => `${label}-${stamp}@studentos.test`;

/**
 * Mints a real link for an account.
 *
 * The raw token is never returned by the API — deliberately, so it cannot leak
 * through a response — and it is not stored either, only its hash. So a test
 * that wants to present one has to obtain it the way the mailer would: from the
 * service that creates it.
 */
async function mintLink(address) {
  const { User } = await import('../src/models/User.js');
  const user = await User.findOne({ email: address });
  assert.ok(user, `no account for ${address}`);
  const { token } = await issueResetToken({ user, userAgent: 'integration-test' });
  return token;
}

async function makeOffice(name, tag) {
  const office = makeClient(harness);
  const registered = await signUp(office, { name, email: email(tag), password, role: 'admin' });
  assert.equal(registered.status, 201, JSON.stringify(registered.body));
  return office;
}

describe('password recovery', { skip }, () => {
  test('a registered address and an unknown one are indistinguishable', async () => {
    const known = email('known');
    await signUp(makeClient(harness), { name: 'Known Student', email: known, password });

    const anon = makeClient(harness);
    const forKnown = await anon.post('/auth/password/forgot', { email: known });
    const forUnknown = await anon.post('/auth/password/forgot', {
      email: email('nobody'),
    });

    assert.equal(forKnown.status, 200, JSON.stringify(forKnown.body));
    assert.equal(forUnknown.status, 200, JSON.stringify(forUnknown.body));

    /*
     * The whole body, not just the status. An extra key on a known address —
     * even one as small as a delivery status — turns this endpoint into a way
     * to ask the server which students have accounts here.
     */
    assert.deepEqual(forKnown.body, forUnknown.body);
  });

  test('the response describes this installation, not an outcome it cannot know', async () => {
    const anon = makeClient(harness);
    const res = await anon.post('/auth/password/forgot', { email: email('capability') });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    // Whether email can be sent at all is a property of the deployment, so it
    // is the same answer for every caller. Saying "sent" would be a claim about
    // an inbox the server cannot see.
    assert.deepEqual(res.data.email, mailerStatus());
    assert.ok(res.data.expiresInMinutes > 0);
  });

  test('an emailed link sets a new password and signs the student in', async () => {
    const address = email('walker');
    await signUp(makeClient(harness), { name: 'Walker Student', email: address, password });

    const token = await mintLink(address);
    const res = await makeClient(harness).post('/auth/password/reset', { token, newPassword });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.data.accessToken, 'a successful reset signs the student straight in');
    assert.equal(res.data.user.mustChangePassword, false);

    const withNew = await makeClient(harness).post('/auth/login', { email: address, password: newPassword });
    assert.equal(withNew.status, 200, JSON.stringify(withNew.body));

    const withOld = await makeClient(harness).post('/auth/login', { email: address, password });
    assert.equal(withOld.status, 401, 'the replaced password must stop working');
  });

  test('a link works exactly once', async () => {
    const address = email('once');
    await signUp(makeClient(harness), { name: 'Once Student', email: address, password });

    const token = await mintLink(address);
    const first = await makeClient(harness).post('/auth/password/reset', { token, newPassword });
    assert.equal(first.status, 200, JSON.stringify(first.body));

    const replay = await makeClient(harness).post('/auth/password/reset', {
      token,
      newPassword: 'replayedpw123',
    });
    assert.equal(replay.status, 400, 'a replayed link must be refused');
  });

  test('a link that has expired is refused', async () => {
    const address = email('stale');
    await signUp(makeClient(harness), { name: 'Stale Student', email: address, password });

    const token = await mintLink(address);
    // Backdated, the way a link left unread overnight would be.
    await OneTimeToken.updateOne(
      { tokenHash: hashToken(token), purpose: 'password-reset' },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const res = await makeClient(harness).post('/auth/password/reset', { token, newPassword });
    assert.equal(res.status, 400, 'an expired link must not still set a password');
  });

  test('a reset ends every session, including the one that survived it', async () => {
    const address = email('sessions');
    const student = makeClient(harness);
    await signUp(student, { name: 'Session Student', email: address, password });

    const cookieBefore = student.state.cookie;
    assert.ok(cookieBefore, 'signing up should leave a refresh cookie');

    const token = await mintLink(address);
    await makeClient(harness).post('/auth/password/reset', { token, newPassword });

    const stale = makeClient(harness);
    stale.state.cookie = cookieBefore;
    const refreshed = await stale.post('/auth/refresh');
    assert.equal(refreshed.status, 401, 'the pre-reset session must not survive');
  });

  test('the placement office can issue a temporary password', async () => {
    const address = email('locked');
    const student = makeClient(harness);
    const registered = await signUp(student, { name: 'Locked Student', email: address, password });
    const cookieBefore = student.state.cookie;

    const office = await makeOffice('Office Staff', 'office');
    const res = await office.post(`/admin/students/${registered.data.user._id}/password-reset`);

    assert.equal(res.status, 200, JSON.stringify(res.body));

    const temporaryPassword = res.data.temporaryPassword;
    assert.ok(temporaryPassword, 'the office is shown the password once');
    assert.equal(res.data.mustChangePassword, true);

    const signIn = await makeClient(harness).post('/auth/login', {
      email: address,
      password: temporaryPassword,
    });
    assert.equal(signIn.status, 200, JSON.stringify(signIn.body));
    assert.equal(
      signIn.data.user.mustChangePassword,
      true,
      'the student is told to replace it rather than left holding it',
    );

    const withOld = await makeClient(harness).post('/auth/login', { email: address, password });
    assert.equal(withOld.status, 401, 'the forgotten password must stop working');

    const stale = makeClient(harness);
    stale.state.cookie = cookieBefore;
    assert.equal(
      (await stale.post('/auth/refresh')).status,
      401,
      'the session that was already open must not survive the reset',
    );
  });

  test('a student replaces a temporary password without being asked to prove it', async () => {
    const address = email('forced');
    const registered = await signUp(makeClient(harness), {
      name: 'Forced Student',
      email: address,
      password,
    });

    const office = await makeOffice('Office Two', 'office2');
    const issued = await office.post(`/admin/students/${registered.data.user._id}/password-reset`);

    const student = makeClient(harness);
    const signIn = await student.post('/auth/login', {
      email: address,
      password: issued.data.temporaryPassword,
    });
    student.state.token = signIn.data.accessToken;

    // Only the new password: the one they hold was chosen by the office, and
    // asking for it would encourage it to be kept.
    const changed = await student.patch('/auth/password', { newPassword: 'settledpassword1' });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.data.user.mustChangePassword, false, 'the flag clears');

    // Once it is no longer temporary, the ordinary rule applies again.
    const noCurrent = await student.patch('/auth/password', { newPassword: 'thirdpassword1' });
    assert.equal(noCurrent.status, 400, 'proof is required again once the password is their own');
  });

  test('a staff reset voids a link that was already outstanding', async () => {
    const address = email('voided');
    const registered = await signUp(makeClient(harness), {
      name: 'Voided Student',
      email: address,
      password,
    });

    const token = await mintLink(address);
    const office = await makeOffice('Office Three', 'office3');
    await office.post(`/admin/students/${registered.data.user._id}/password-reset`);

    const res = await makeClient(harness).post('/auth/password/reset', { token, newPassword });
    assert.equal(res.status, 400, 'the link the office superseded must not still work');
  });

  test('the office reset is recorded without the password in it', async () => {
    const address = email('audited');
    const registered = await signUp(makeClient(harness), {
      name: 'Audited Student',
      email: address,
      password,
    });

    const office = await makeOffice('Office Four', 'office4');
    const issued = await office.post(`/admin/students/${registered.data.user._id}/password-reset`);
    const temporaryPassword = issued.data.temporaryPassword;

    const events = await office.get('/admin/activity?entityType=user');
    const entry = (events.data.events ?? []).find((event) => event.action === 'student.password-reset');
    assert.ok(entry, 'the reset appears in the audit trail');

    /*
     * The log is read by more people and kept far longer than the one response
     * that displayed the password, so the plaintext must never reach it.
     */
    assert.ok(
      !JSON.stringify(entry).includes(temporaryPassword),
      'the audit entry must not contain the password',
    );
  });

  test('only the office can reset credentials', async () => {
    const address = email('escalate');
    const registered = await signUp(makeClient(harness), {
      name: 'Escalate Student',
      email: address,
      password,
    });

    // A student pointing the staff endpoint at their own account.
    const student = makeClient(harness);
    const signIn = await student.post('/auth/login', { email: address, password });
    student.state.token = signIn.data.accessToken;

    const res = await student.post(`/admin/students/${registered.data.user._id}/password-reset`);
    assert.equal(res.status, 403, 'a student must not be able to mint credentials');
  });
});
