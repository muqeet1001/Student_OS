import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { User } from '../src/models/User.js';
import { OneTimeToken } from '../src/models/OneTimeToken.js';
import { issueVerificationToken, verificationTokenTtlMinutes } from '../src/services/emailVerification.js';
import { issueResetToken } from '../src/services/passwordReset.js';
import { hashToken } from '../src/services/token.service.js';
import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';

const harness = await startHarness('emailverify');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

const stamp = Date.now();
const password = 'password123';
const newPassword = 'brandnewpw99';
const email = (label) => `${label}-${stamp}@studentos.test`;

/** Mints a real confirmation link, the way the email path would. */
async function mintVerificationLink(address) {
  const user = await User.findOne({ email: address });
  const { token } = await issueVerificationToken({ user, userAgent: 'integration-test' });
  return token;
}

async function mintResetLink(address) {
  const user = await User.findOne({ email: address });
  const { token } = await issueResetToken({ user, userAgent: 'integration-test' });
  return token;
}

describe('email verification', { skip }, () => {
  test('registering issues a link, and the student is usable whether or not it arrives', async () => {
    const address = email('fresh');
    const student = makeClient(harness);
    const created = await signUp(student, { name: 'Fresh Student', email: address, password });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.ok(created.data.accessToken, 'signup still signs the student in');
    assert.equal(created.data.user.emailVerifiedAt, null, 'a new address starts unproven');

    // A link was issued even though no relay is configured — the delivery is
    // what fails, not the bookkeeping.
    const issued = await OneTimeToken.countDocuments({
      purpose: 'email-verification',
      usedAt: null,
    });
    assert.ok(issued > 0, 'registration should issue a confirmation link');
  });

  test('the link confirms the address and records when', async () => {
    const address = email('confirms');
    await signUp(makeClient(harness), { name: 'Confirm Student', email: address, password });

    const token = await mintVerificationLink(address);
    const res = await makeClient(harness).post('/auth/verify-email', { token });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.data.emailVerifiedAt, 'the timestamp is returned');
    assert.equal(res.data.user.emailVerifiedAt !== null, true);

    const stored = await User.findOne({ email: address });
    assert.ok(stored.emailVerifiedAt instanceof Date, 'the date is persisted');
  });

  test('a confirmation link works exactly once', async () => {
    const address = email('once');
    await signUp(makeClient(harness), { name: 'Once Student', email: address, password });

    const token = await mintVerificationLink(address);
    const first = await makeClient(harness).post('/auth/verify-email', { token });
    assert.equal(first.status, 200, JSON.stringify(first.body));

    const second = await makeClient(harness).post('/auth/verify-email', { token });
    assert.equal(second.status, 400, 'a replayed link must be refused');
  });

  test('confirming twice does not move the recorded date', async () => {
    const address = email('twice');
    await signUp(makeClient(harness), { name: 'Twice Student', email: address, password });

    const first = await mintVerificationLink(address);
    const opened = await makeClient(harness).post('/auth/verify-email', { token: first });
    const original = opened.data.emailVerifiedAt;

    // A mail client may open the link in two tabs, and the second must not
    // rewrite when the address was actually proved.
    const again = await mintVerificationLink(address);
    const second = await makeClient(harness).post('/auth/verify-email', { token: again });

    assert.equal(second.status, 200);
    assert.equal(
      new Date(second.data.emailVerifiedAt).getTime(),
      new Date(original).getTime(),
      'the first confirmation stands',
    );
  });

  test('an expired confirmation link is refused', async () => {
    const address = email('stale');
    await signUp(makeClient(harness), { name: 'Stale Student', email: address, password });

    const token = await mintVerificationLink(address);
    // Backdated, the way a link left unread for a fortnight would be.
    await OneTimeToken.updateOne(
      { tokenHash: hashToken(token), purpose: 'email-verification' },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const res = await makeClient(harness).post('/auth/verify-email', { token });
    assert.equal(res.status, 400, 'an expired link must not confirm an address');
  });

  /*
   * The property that the shared collection makes worth pinning down. Both
   * flows keep their grants in one collection, so the only thing separating
   * them is the purpose written into every query. If that filter were ever
   * dropped, a password-reset link would also prove an email address, and
   * whoever held it could claim a different fact about the account than the one
   * they were given.
   */
  test('a password-reset link cannot confirm an email address', async () => {
    const address = email('crossreset');
    await signUp(makeClient(harness), { name: 'Cross Reset', email: address, password });

    const token = await mintResetLink(address);
    const res = await makeClient(harness).post('/auth/verify-email', { token });

    assert.equal(res.status, 400, 'a reset link must not satisfy email verification');

    const stored = await User.findOne({ email: address });
    assert.equal(stored.emailVerifiedAt, null, 'and the address stays unproven');
  });

  test('a confirmation link cannot reset a password', async () => {
    const address = email('crossverify');
    await signUp(makeClient(harness), { name: 'Cross Verify', email: address, password });

    const token = await mintVerificationLink(address);
    const res = await makeClient(harness).post('/auth/password/reset', { token, newPassword });

    assert.equal(res.status, 400, 'a confirmation link must not set a password');

    // The old password still works, which is the thing that actually matters.
    const stillValid = await makeClient(harness).post('/auth/login', { email: address, password });
    assert.equal(stillValid.status, 200);
  });

  test('resending needs a session, and says plainly when there is no mail relay', async () => {
    const address = email('resend');
    const student = makeClient(harness);
    await signUp(student, { name: 'Resend Student', email: address, password });

    const anonymous = await makeClient(harness).post('/auth/verify-email/resend');
    assert.equal(anonymous.status, 401, 'an anonymous caller must not be able to post mail');

    const res = await student.post('/auth/verify-email/resend');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(typeof res.data.email.available, 'boolean');
    // With no SMTP the message must not tell the student to check an inbox that
    // was never written to.
    if (!res.data.email.available) {
      assert.match(res.data.message, /no email configured/i);
    }
    assert.equal(res.data.expiresInMinutes, verificationTokenTtlMinutes());
  });

  test('an already-confirmed address is not re-sent a link', async () => {
    const address = email('done');
    const student = makeClient(harness);
    await signUp(student, { name: 'Done Student', email: address, password });

    const token = await mintVerificationLink(address);
    await makeClient(harness).post('/auth/verify-email', { token });

    const res = await student.post('/auth/verify-email/resend');
    assert.equal(res.status, 200);
    assert.match(res.data.message, /already confirmed/i);
  });
});
