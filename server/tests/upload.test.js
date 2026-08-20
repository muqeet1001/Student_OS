import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalUploadName, detectUploadType } from '../src/middleware/upload.js';

test('upload type is detected from bytes rather than the claimed filename', () => {
  const pdf = Buffer.from('%PDF-1.7\n', 'ascii');
  assert.deepEqual(detectUploadType(pdf), { mime: 'application/pdf', extension: '.pdf' });
  assert.equal(canonicalUploadName('payload.html', '.pdf'), 'payload.pdf');
});

test('active content disguised as an image or PDF is rejected', () => {
  const html = Buffer.from('<script src="/attack.js"></script>', 'utf8');
  const javascript = Buffer.from('fetch("/api/auth/refresh", {method:"POST"})', 'utf8');

  assert.equal(detectUploadType(html), null);
  assert.equal(detectUploadType(javascript), null);
});

test('supported image signatures are recognised', () => {
  const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  const jpeg = Buffer.from('ffd8ffe000104a464946', 'hex');
  const gif = Buffer.from('GIF89a', 'ascii');
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);

  assert.equal(detectUploadType(png)?.mime, 'image/png');
  assert.equal(detectUploadType(jpeg)?.mime, 'image/jpeg');
  assert.equal(detectUploadType(gif)?.mime, 'image/gif');
  assert.equal(detectUploadType(webp)?.mime, 'image/webp');
});

test('canonical names cannot retain executable or path-controlled extensions', () => {
  assert.equal(canonicalUploadName('../../report.html', '.pdf'), 'report.pdf');
  assert.equal(canonicalUploadName('photo.js', '.png'), 'photo.png');
  assert.equal(canonicalUploadName('unsafe\r\nname.svg', '.jpg'), 'unsafename.jpg');
});
