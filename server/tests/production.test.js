import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Production serving checks. These run against the real app with
 * NODE_ENV=production but no database, because static serving, the SPA
 * fallback and cache headers are all independent of Mongo.
 */
process.env.NODE_ENV = 'production';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
process.env.CHECKIN_SECRET ||= 'test-checkin-secret';

const clientDist = path.resolve(import.meta.dirname, '../../client/dist');
const hasBuild = existsSync(path.join(clientDist, 'index.html'));

let server;
let base;

before(async () => {
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test('health check responds without a database', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
});

test('an unknown API path returns JSON, not the SPA shell', async () => {
  const res = await fetch(`${base}/api/definitely-not-a-route`);

  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
});

test('client routes fall back to the SPA shell', { skip: !hasBuild && 'client not built' }, async () => {
  // Deep links must work on a hard refresh, not only via client-side routing.
  for (const route of ['/', '/dashboard', '/company-prep/google']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, `${route} should serve the shell`);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/, route);
  }
});

test('the shell is never cached but hashed assets are', { skip: !hasBuild && 'client not built' }, async () => {
  const shell = await fetch(`${base}/`);
  assert.match(
    shell.headers.get('cache-control') ?? '',
    /no-cache/,
    'a cached shell keeps users on a stale build after deploy',
  );

  const assetPath = (await shell.text()).match(/\/assets\/[^"']+\.js/)?.[0];
  assert.ok(assetPath, 'the shell should reference a hashed asset');

  const asset = await fetch(base + assetPath);
  assert.match(asset.headers.get('cache-control') ?? '', /max-age=31536000/);
});

test('security headers are applied', async () => {
  const res = await fetch(`${base}/api/health`);

  assert.ok(res.headers.get('x-content-type-options'), 'helmet should set nosniff');
  assert.equal(res.headers.get('x-powered-by'), null, 'Express should not advertise itself');
});
