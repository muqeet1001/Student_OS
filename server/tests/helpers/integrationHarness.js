/**
 * Shared harness for integration suites that need a real database.
 *
 * Extracted so a second suite does not duplicate the connect/seed/skip
 * dance — and so the loud-skip behaviour is guaranteed identical across
 * every suite rather than remembered by whoever writes the next one.
 */
import mongoose from 'mongoose';

// Importing the config first loads server/.env, so MONGO_URI is populated
// before it is read. Reading process.env directly would find it empty.
import { config } from '../../src/config/env.js';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'integration-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'integration-refresh-secret';
process.env.CHECKIN_SECRET ||= 'integration-checkin-secret';

/** Points the URI at a suite-specific database so real collections are safe. */
function toTestUri(uri, suffix) {
  if (!uri) return '';
  const [head, query] = uri.split('?');
  const trimmed = head.replace(/\/$/, '');
  const afterHost = trimmed.slice(trimmed.lastIndexOf('/') + 1);

  // No database segment (…mongodb.net) — append one.
  const base = afterHost.includes('.') ? `${trimmed}/student_os` : trimmed;
  return `${base}_${suffix}${query ? `?${query}` : ''}`;
}

/**
 * Connects, seeds and starts the app.
 *
 * Must be awaited at module scope: node:test evaluates a suite's `skip`
 * option when the suite is registered, which happens before any hook runs.
 *
 * @param {string} suffix Database suffix, so parallel suites never collide.
 */
export async function startHarness(suffix = 'test') {
  const uri = toTestUri(config.mongoUri, suffix);

  const harness = { uri, server: null, base: '', skipReason: null };

  if (!uri) {
    harness.skipReason = 'MONGO_URI is not set in server/.env';
  } else {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      await mongoose.connection.db.dropDatabase();

      const { run } = await import('../../src/seed/index.js');
      await run({ connect: false });

      const { createApp } = await import('../../src/app.js');
      harness.server = createApp().listen(0);
      await new Promise((resolve) => harness.server.once('listening', resolve));
      harness.base = `http://127.0.0.1:${harness.server.address().port}/api`;
    } catch (error) {
      harness.skipReason = `no database reachable (${error.message.split('\n')[0].slice(0, 90)})`;
      await mongoose.disconnect().catch(() => {});
    }
  }

  /*
   * Shout about a skip.
   *
   * The original integration suite skipped silently for its entire
   * existence, so its assertions had never once run — and when they finally
   * did, three were real bugs. A skipped suite that looks identical to a
   * passing one buys false confidence, which is worse than no suite.
   */
  if (harness.skipReason) {
    console.warn(
      `\n\x1b[33m⚠  INTEGRATION TESTS SKIPPED (${suffix}) — ${harness.skipReason}\x1b[0m\n` +
        '   Nothing in this suite has been verified against a real database.\n' +
        '   Start one and re-run:\n' +
        '     docker run -d -p 27017:27017 --name student-os-mongo mongo:7\n' +
        '     MONGO_URI="mongodb://127.0.0.1:27017/student_os" npm test\n',
    );
  }

  return harness;
}

export async function stopHarness(harness) {
  harness.server?.close();
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
}

/** Minimal client that carries the access token and the refresh cookie. */
export function makeClient(harness) {
  const state = { token: null, cookie: null };

  const client = {
    state,
    async call(method, path, body) {
      const headers = {};
      if (state.token) headers.Authorization = `Bearer ${state.token}`;
      if (state.cookie) headers.Cookie = state.cookie;
      if (body) headers['Content-Type'] = 'application/json';

      const res = await fetch(harness.base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) state.cookie = setCookie.split(';')[0];

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* Non-JSON body; the status carries the result. */
      }

      return { status: res.status, body: json, data: json?.data };
    },
    get: (p) => client.call('GET', p),
    post: (p, b) => client.call('POST', p, b),
    patch: (p, b) => client.call('PATCH', p, b),
    delete: (p) => client.call('DELETE', p),
  };

  return client;
}

/** Registers a user and leaves the client authenticated as them. */
export async function signUp(client, { name, email, password = 'password123', role }) {
  const res = await client.post('/auth/register', { name, email, password });
  client.state.token = res.data?.accessToken ?? null;

  if (role && role !== 'student') {
    // Roles are not self-assignable through the API, by design — promote
    // directly so the suite can exercise staff endpoints.
    const { User } = await import('../../src/models/User.js');
    await User.updateOne({ email: email.toLowerCase() }, { role });

    // The token carries the old role, so trade it for a fresh one.
    const again = await client.post('/auth/login', { email, password });
    client.state.token = again.data?.accessToken ?? null;
  }

  return res;
}
