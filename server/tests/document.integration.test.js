import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { makeClient, signUp, startHarness, stopHarness } from './helpers/integrationHarness.js';
import { safeFilename } from '../src/services/fileStore.js';

/**
 * The document vault, against a real database.
 *
 * Bytes go into GridFS, which cannot be tested any other way — a unit test
 * over a buffer proves nothing about whether the file comes back out.
 */
const harness = await startHarness('documents');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

const student = makeClient(harness);
const other = makeClient(harness);
const staff = makeClient(harness);

const stamp = Date.now();
let documentId;
let studentId;

const PNG = Buffer.from('89504e470d0a1a0a00000000', 'hex');

/** A small but genuine PDF, so the content type is not a lie. */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8',
);

async function upload(client, { kind = 'id-proof', filename = 'proof.pdf', body: extra = {}, bytes = PDF } = {}) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
  form.append('kind', kind);
  for (const [key, value] of Object.entries(extra)) form.append(key, value);

  const headers = {};
  if (client.state.token) headers.Authorization = `Bearer ${client.state.token}`;

  const res = await fetch(`${harness.base}/documents`, { method: 'POST', headers, body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json, data: json?.data };
}

describe('document vault', { skip }, () => {
  test('accounts can be created', async () => {
    const learner = await signUp(student, {
      name: 'Doc Student',
      email: `doc${stamp}@studentos.test`,
    });
    studentId = learner.data.user._id ?? learner.data.user.id;

    await signUp(other, { name: 'Other Student', email: `other${stamp}@studentos.test` });
    await signUp(staff, {
      name: 'Doc Officer',
      email: `docstaff${stamp}@studentos.test`,
      role: 'admin',
    });
  });

  test('an avatar is byte-validated, persisted and served with safe headers', async () => {
    const form = new FormData();
    form.append('avatar', new Blob([PNG], { type: 'image/png' }), 'avatar.html');

    const uploadResponse = await fetch(`${harness.base}/profile/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.state.token}` },
      body: form,
    });
    const uploadBody = await uploadResponse.json();

    assert.equal(uploadResponse.status, 200, JSON.stringify(uploadBody));
    assert.match(uploadBody.data.user.avatarUrl, /^\/api\/profile\/assets\/[a-f\d]{24}$/i);
    assert.doesNotMatch(uploadBody.data.user.avatarUrl, /\.html$/i);

    const origin = harness.base.replace(/\/api$/, '');
    const assetResponse = await fetch(origin + uploadBody.data.user.avatarUrl);
    assert.equal(assetResponse.status, 200);
    assert.equal(assetResponse.headers.get('content-type'), 'image/png');
    assert.match(assetResponse.headers.get('content-disposition'), /^inline;/);
    assert.equal(assetResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await assetResponse.arrayBuffer()), PNG);
  });

  test('an avatar cannot disguise active content with an image MIME header', async () => {
    const form = new FormData();
    form.append(
      'avatar',
      new Blob(['<script src="/attack.js"></script>'], { type: 'image/png' }),
      'avatar.png',
    );

    const response = await fetch(`${harness.base}/profile/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.state.token}` },
      body: form,
    });
    assert.equal(response.status, 400);
  });

  test('certificate evidence is durable and private to its owner', async () => {
    const created = await student.post('/profile/me/certifications', {
      kind: 'certificate',
      title: 'Secure uploads',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const certificationId = created.data.item._id;
    const form = new FormData();
    form.append('file', new Blob([PDF], { type: 'application/pdf' }), 'certificate.html');

    const uploaded = await fetch(
      `${harness.base}/profile/me/certifications/${certificationId}/file`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${student.state.token}` },
        body: form,
      },
    );
    const uploadedBody = await uploaded.json();
    assert.equal(uploaded.status, 200, JSON.stringify(uploadedBody));

    const fileUrl = uploadedBody.data.item.fileUrl;
    assert.match(fileUrl, /\/download$/);
    assert.doesNotMatch(fileUrl, /\.html/i);

    const origin = harness.base.replace(/\/api$/, '');
    const ownerDownload = await fetch(origin + fileUrl, {
      headers: { Authorization: `Bearer ${student.state.token}` },
    });
    assert.equal(ownerDownload.status, 200);
    assert.equal(ownerDownload.headers.get('content-type'), 'application/pdf');
    assert.match(ownerDownload.headers.get('content-disposition'), /^attachment;/);
    assert.equal(ownerDownload.headers.get('cache-control'), 'private, no-store');

    const otherDownload = await fetch(origin + fileUrl, {
      headers: { Authorization: `Bearer ${other.state.token}` },
    });
    assert.equal(otherDownload.status, 404);
  });

  test('a student uploads a document and it is stored', async () => {
    const res = await upload(student, { filename: 'aadhaar.pdf' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    documentId = res.data.document._id;

    assert.equal(res.data.document.kind, 'id-proof');
    assert.equal(res.data.document.status, 'pending');
    assert.equal(res.data.document.size, PDF.length);
    assert.ok(res.data.document.checksum, 'a checksum proves the bytes round-tripped');
    assert.ok(res.data.document.file, 'the GridFS id is recorded');
  });

  /** The whole point of GridFS here: the bytes must come back byte-identical. */
  test('the file downloads with exactly the bytes that went in', async () => {
    const res = await fetch(`${harness.base}/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${student.state.token}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.match(
      res.headers.get('content-disposition'),
      /^attachment;/,
      'never inline — a PDF or SVG must not execute in the page origin',
    );

    const body = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(body, PDF, 'the bytes must survive the round trip unchanged');
  });

  test('the vault reports what is still missing', async () => {
    const res = await student.get('/documents');

    assert.equal(res.status, 200);
    assert.equal(res.data.documents.length, 1);

    const missing = res.data.missing.map((kind) => kind.key);
    assert.ok(missing.includes('marksheet'), 'a required kind not yet uploaded');
    assert.ok(!missing.includes('id-proof'), 'the one just uploaded is no longer missing');
  });

  test('rejects a file type outside the allow-list', async () => {
    const form = new FormData();
    form.append('file', new Blob(['#!/bin/sh\nrm -rf /\n'], { type: 'text/x-sh' }), 'evil.sh');
    form.append('kind', 'other');

    const res = await fetch(`${harness.base}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.state.token}` },
      body: form,
    });

    assert.equal(res.status, 400);
  });

  test('rejects active content even when its multipart type claims PDF', async () => {
    const form = new FormData();
    form.append(
      'file',
      new Blob(['<script src="/uploads/attack.js"></script>'], { type: 'application/pdf' }),
      'proof.pdf',
    );
    form.append('kind', 'other');

    const res = await fetch(`${harness.base}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.state.token}` },
      body: form,
    });

    assert.equal(res.status, 400);
  });

  test('rejects a kind outside the closed list', async () => {
    const res = await upload(student, { kind: 'passport' });

    assert.equal(res.status, 400);
  });

  test('another student can neither see nor download it', async () => {
    const list = await other.get('/documents');
    assert.deepEqual(list.data.documents, [], 'a vault is private to its owner');

    const download = await fetch(`${harness.base}/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${other.state.token}` },
    });

    // 404 rather than 403: confirming someone else's document exists is
    // itself a small leak.
    assert.equal(download.status, 404);
  });

  test('another student cannot delete it', async () => {
    const res = await other.delete(`/documents/${documentId}`);
    assert.equal(res.status, 404);
  });

  test('a student cannot file a document into another student vault', async () => {
    const res = await upload(other, { body: { owner: studentId } });

    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  test('staff can see it and mark it verified', async () => {
    const list = await staff.get(`/documents?student=${studentId}`);
    assert.equal(list.data.documents.length, 1);
    assert.equal(list.data.documents[0].owner.name, 'Doc Student');

    const review = await staff.patch(`/documents/${documentId}/review`, {
      status: 'verified',
      reviewNote: 'Matches the roll list.',
    });

    assert.equal(review.status, 200, JSON.stringify(review.body));
    assert.equal(review.data.document.status, 'verified');
    assert.ok(review.data.document.reviewedAt, 'a review records when');
    assert.ok(review.data.document.reviewedBy, 'and by whom');
  });

  test('a student cannot review their own document', async () => {
    const res = await student.patch(`/documents/${documentId}/review`, { status: 'verified' });
    assert.equal(res.status, 403);
  });

  /** Otherwise a student could withdraw evidence the office already accepted. */
  test('a student cannot delete a document once it is verified', async () => {
    const res = await student.delete(`/documents/${documentId}`);

    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.match(res.body.message, /placement office/);
  });

  test('staff can file a document on a student behalf', async () => {
    const res = await upload(staff, {
      kind: 'offer-letter',
      filename: 'offer.pdf',
      body: { owner: studentId },
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(String(res.data.document.owner), String(studentId));

    // And the student sees it in their own vault.
    const list = await student.get('/documents');
    assert.equal(list.data.documents.length, 2);
  });

  test('staff can delete a verified document, and the bytes go with it', async () => {
    const res = await staff.delete(`/documents/${documentId}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const download = await fetch(`${harness.base}/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${staff.state.token}` },
    });
    assert.equal(download.status, 404);
  });

  test('an unauthenticated request gets nothing', async () => {
    const res = await fetch(`${harness.base}/documents`);
    assert.equal(res.status, 401);
  });
});

describe('filename safety', { skip: false }, () => {
  /**
   * Filenames arrive from the client and end up in a Content-Disposition
   * header. A newline there would let a crafted name inject a header.
   */
  test('a filename cannot carry a path, a quote or a newline', () => {
    // Only the last path segment survives, which is stricter than
    // stripping separators: '../../etc/passwd' cannot become 'etcpasswd'.
    assert.equal(safeFilename('../../etc/passwd'), 'passwd');
    assert.equal(safeFilename('C:\\Windows\\system32\\evil.exe'), 'evil.exe');
    assert.equal(safeFilename('report".pdf'), 'report.pdf');
    assert.equal(safeFilename('a\r\nContent-Length: 0\r\n\r\n.pdf'), 'aContent-Length: 0.pdf');
  });

  test('an empty or missing filename falls back rather than producing nothing', () => {
    assert.equal(safeFilename(''), 'document');
    assert.equal(safeFilename('   '), 'document');
    assert.equal(safeFilename(null), 'document');
    assert.equal(safeFilename('///'), 'document');
  });

  test('a long filename is truncated', () => {
    assert.ok(safeFilename(`${'a'.repeat(500)}.pdf`).length <= 120);
  });

  test('an ordinary filename survives intact', () => {
    assert.equal(safeFilename('Marksheet_Sem6.pdf'), 'Marksheet_Sem6.pdf');
    // Spaces and hyphens are ordinary in a filename and must not be eaten.
    assert.equal(safeFilename('My Report - final.pdf'), 'My Report - final.pdf');
  });
});
