import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, startHarness, stopHarness } from './helpers/integrationHarness.js';
import { User } from '../src/models/User.js';
import { fileExists } from '../src/services/fileStore.js';

const harness = await startHarness('auth_lifecycle');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

const client = makeClient(harness);
const stamp = Date.now();
const testEmail = `lifecycle_${stamp}@studentos.test`;
let uploadedAvatarId = null;

describe('Auth Lifecycle & Storage (Phase 1)', { skip }, () => {
  test('registration creates an unverified user with verification token stored as hash', async () => {
    const signupRes = await client.call('POST', '/auth/register', {
      name: 'Lifecycle Student',
      email: testEmail,
      password: 'Password123!',
    });

    assert.equal(signupRes.status, 201);
    assert.equal(signupRes.data.user.email, testEmail);
    assert.equal(signupRes.data.user.isVerified, false);

    // Verify database internal state
    const dbUser = await User.findOne({ email: testEmail })
      .select('+emailVerificationTokenHash +emailVerificationExpiresAt')
      .lean();

    assert.ok(dbUser.emailVerificationTokenHash, 'Verification token hash must be set');
    assert.ok(dbUser.emailVerificationExpiresAt > new Date(), 'Verification expiration must be in the future');
  });

  test('cannot verify email with invalid token', async () => {
    const res = await client.call('POST', '/auth/verify-email', {
      email: testEmail,
      token: 'completely-invalid-token-hex',
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /invalid or expired/i);
  });

  test('resend verification generates a new verification token', async () => {
    const res = await client.call('POST', '/auth/resend-verification', {
      email: testEmail,
    });

    assert.equal(res.status, 200);
    assert.match(res.data.message, /sent/i);
  });

  test('email verification succeeds with valid token and sets isVerified = true', async () => {
    // Generate a known token and update user's record
    const { generateRandomToken, hashToken } = await import('../src/services/token.service.js');
    const token = generateRandomToken();

    await User.updateOne(
      { email: testEmail },
      {
        $set: {
          emailVerificationTokenHash: hashToken(token),
          emailVerificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    );

    const res = await client.call('POST', '/auth/verify-email', {
      email: testEmail,
      token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.isVerified, true);

    const verifiedUser = await User.findOne({ email: testEmail }).lean();
    assert.equal(verifiedUser.isVerified, true);
  });

  test('forgot password generates a reset token and reset-password successfully changes password', async () => {
    const { generateRandomToken, hashToken } = await import('../src/services/token.service.js');
    const resetToken = generateRandomToken();

    await User.updateOne(
      { email: testEmail },
      {
        $set: {
          passwordResetTokenHash: hashToken(resetToken),
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    );

    const newPassword = 'BrandNewPassword123!';
    const resetRes = await client.call('POST', '/auth/reset-password', {
      email: testEmail,
      token: resetToken,
      newPassword,
    });

    assert.equal(resetRes.status, 200);

    // Old password should fail
    const failLogin = await client.call('POST', '/auth/login', {
      email: testEmail,
      password: 'Password123!',
    });
    assert.equal(failLogin.status, 401);

    // New password should succeed
    const successLogin = await client.call('POST', '/auth/login', {
      email: testEmail,
      password: newPassword,
    });
    assert.equal(successLogin.status, 200);
    assert.ok(successLogin.data.accessToken);
  });

  test('avatar upload stores image in GridFS and streams via /api/media/:fileId', async () => {
    const imageBytes = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;', 'binary');

    const form = new FormData();
    form.append('avatar', new Blob([imageBytes], { type: 'image/gif' }), 'avatar.gif');

    const headers = {};
    if (client.state.token) headers.Authorization = `Bearer ${client.state.token}`;

    const res = await fetch(`${harness.base}/profile/me/avatar`, {
      method: 'POST',
      headers,
      body: form,
    });

    const json = await res.json();
    assert.equal(res.status, 200, JSON.stringify(json));
    assert.ok(json.data.user.avatarUrl.startsWith('/api/media/'), 'Avatar URL must point to /api/media/');

    uploadedAvatarId = json.data.user.avatarUrl.replace('/api/media/', '');

    // Stream download from media route
    const streamRes = await fetch(`${harness.base}/media/${uploadedAvatarId}`);
    assert.equal(streamRes.status, 200);
    assert.equal(streamRes.headers.get('content-type'), 'image/gif');
    assert.ok(streamRes.headers.get('cache-control')?.includes('immutable'));

    const downloadedBytes = Buffer.from(await streamRes.arrayBuffer());
    assert.equal(downloadedBytes.length, imageBytes.length);

    // Verify it exists in GridFS
    const exists = await fileExists(uploadedAvatarId);
    assert.equal(exists, true);
  });

  test('replacing avatar cleans up previous GridFS file', async () => {
    assert.ok(uploadedAvatarId, 'Previous avatar must exist');

    const newImageBytes = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;', 'binary');

    const form = new FormData();
    form.append('avatar', new Blob([newImageBytes], { type: 'image/gif' }), 'new_avatar.gif');

    const headers = {};
    if (client.state.token) headers.Authorization = `Bearer ${client.state.token}`;

    const res = await fetch(`${harness.base}/profile/me/avatar`, {
      method: 'POST',
      headers,
      body: form,
    });

    const json = await res.json();
    assert.equal(res.status, 200);

    const newAvatarId = json.data.user.avatarUrl.replace('/api/media/', '');
    assert.notEqual(newAvatarId, uploadedAvatarId);

    // The new one must exist
    const newExists = await fileExists(newAvatarId);
    assert.equal(newExists, true);

    // Old avatar file in GridFS should have been cleaned up
    const oldExists = await fileExists(uploadedAvatarId);
    assert.equal(oldExists, false, 'Old avatar must be deleted from GridFS');
  });
});
