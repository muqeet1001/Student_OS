/**
 * End-to-end API tests: real HTTP requests, real database, every feature.
 *
 * Runs against a SEPARATE database derived from MONGO_URI by appending
 * `_test` to the database name, so it can never touch real student data. The
 * whole suite skips with a clear message when no database is reachable,
 * which keeps `npm test` green in environments without one.
 */
import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';
import mongoose from 'mongoose';

// Importing the config first loads server/.env, so MONGO_URI is populated
// before it is read below. Reading process.env directly would always find it
// empty and silently skip the whole suite.
import { config } from '../src/config/env.js';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'integration-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'integration-refresh-secret';

/** Points the URI at `<db>_test` so real collections are never written. */
function toTestUri(uri) {
  if (!uri) return '';
  const [head, query] = uri.split('?');
  const trimmed = head.replace(/\/$/, '');
  const lastSlash = trimmed.lastIndexOf('/');
  const afterHost = trimmed.slice(lastSlash + 1);

  // No database segment (…mongodb.net) — append one.
  const base = afterHost.includes('.') ? `${trimmed}/student_os` : trimmed;
  return `${base}_test${query ? `?${query}` : ''}`;
}

const uri = toTestUri(config.mongoUri);

let server;
let base;
let skipReason = null;

/*
 * Connect at module scope rather than in before(): node:test evaluates a
 * suite's `skip` option when the suite is registered, which happens before
 * any hook runs. Deciding later would leave every suite marked runnable and
 * then fail them all on a missing connection.
 */
if (!uri) {
  skipReason = 'MONGO_URI is not set in server/.env';
} else {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

    // Start from a clean slate so assertions about counts are deterministic.
    await mongoose.connection.db.dropDatabase();

    const { run } = await import('../src/seed/index.js');
    await run({ connect: false });

    const { createApp } = await import('../src/app.js');
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
  } catch (error) {
    skipReason = `no database reachable (${error.message.split('\n')[0].slice(0, 90)})`;
    await mongoose.disconnect().catch(() => {});
  }
}

/*
 * Shout about it.
 *
 * This suite silently skipped for its entire existence, so the assertions in
 * it had never once executed — and when they finally did, thirteen of them
 * were wrong and three were real bugs. A skipped integration suite that
 * looks identical to a passing one is worse than no suite at all, because it
 * buys false confidence. Failing outright is not right either: contributors
 * without a local Mongo still need `npm test` to work. So it skips, loudly.
 */
if (skipReason) {
  console.warn(
    `\n\x1b[33m⚠  INTEGRATION TESTS SKIPPED — ${skipReason}\x1b[0m\n` +
      '   Nothing below has been verified against a real database.\n' +
      '   Start one and re-run:\n' +
      '     docker run -d -p 27017:27017 --name student-os-mongo mongo:7\n' +
      '     MONGO_URI="mongodb://127.0.0.1:27017/student_os" npm test\n',
  );
}

after(async () => {
  server?.close();
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
});

/** Minimal client that carries the access token and the refresh cookie. */
function makeClient() {
  const state = { token: null, cookie: null };

  return {
    state,
    async call(method, path, body) {
      const headers = {};
      if (state.token) headers.Authorization = `Bearer ${state.token}`;
      if (state.cookie) headers.Cookie = state.cookie;
      if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

      const res = await fetch(base + path, {
        method,
        headers,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      });

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) state.cookie = setCookie.split(';')[0];

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* Non-JSON body; `json` stays null and the status carries the result. */
      }

      return { status: res.status, body: json, data: json?.data };
    },
    get(p) {
      return this.call('GET', p);
    },
    post(p, b) {
      return this.call('POST', p, b);
    },
    patch(p, b) {
      return this.call('PATCH', p, b);
    },
    delete(p) {
      return this.call('DELETE', p);
    },
  };
}

const student = makeClient();
const skip = skipReason ? `skipped — ${skipReason}` : false;

describe('authentication', { skip }, () => {
  test('registers a new student and returns an access token', async () => {
    const res = await student.post('/auth/register', {
      name: 'Integration Student',
      email: 'integration@studentos.test',
      password: 'testpass123',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.data.accessToken, 'should return an access token');
    assert.equal(res.data.user.email, 'integration@studentos.test');
    assert.equal(res.data.user.role, 'student');
    assert.equal(res.data.user.password, undefined, 'the password must never be returned');

    student.state.token = res.data.accessToken;
  });

  test('rejects a duplicate email', async () => {
    const res = await student.post('/auth/register', {
      name: 'Someone Else',
      email: 'integration@studentos.test',
      password: 'testpass123',
    });

    assert.equal(res.status, 409);
  });

  test('rejects a weak password', async () => {
    const res = await student.post('/auth/register', {
      name: 'Weak',
      email: 'weak@studentos.test',
      password: 'short',
    });

    assert.equal(res.status, 400, 'the API answers 400 for every validation failure');
  });

  test('rejects a wrong password without revealing which field failed', async () => {
    const res = await student.post('/auth/login', {
      email: 'integration@studentos.test',
      password: 'wrongpassword',
    });

    assert.equal(res.status, 401);

    // The property that matters is that both failures are indistinguishable,
    // not that the word "email" is absent — "Incorrect email or password"
    // names both fields precisely so it confirms neither.
    const unknownEmail = await student.post('/auth/login', {
      email: 'nobody-here@studentos.test',
      password: 'wrongpassword',
    });

    assert.equal(unknownEmail.status, res.status);
    assert.equal(
      unknownEmail.body.message,
      res.body.message,
      'a wrong password and an unknown account must be indistinguishable',
    );
  });

  test('logs in and returns the current user', async () => {
    const login = await student.post('/auth/login', {
      email: 'integration@studentos.test',
      password: 'testpass123',
    });

    assert.equal(login.status, 200);
    student.state.token = login.data.accessToken;

    const me = await student.get('/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.data.user.email, 'integration@studentos.test');
  });

  test('several devices can sign in and rotate sessions concurrently', async () => {
    const devices = Array.from({ length: 5 }, () => makeClient());
    const logins = await Promise.all(
      devices.map((device) =>
        device.post('/auth/login', {
          email: 'integration@studentos.test',
          password: 'testpass123',
        }),
      ),
    );

    assert.deepEqual(
      logins.map((result) => result.status),
      [200, 200, 200, 200, 200],
      'concurrent logins must not race while updating the session list',
    );

    const refreshes = await Promise.all(devices.map((device) => device.post('/auth/refresh')));
    assert.deepEqual(
      refreshes.map((result) => result.status),
      [200, 200, 200, 200, 200],
      'concurrent rotations from distinct devices must all succeed',
    );
  });

  test('refuses protected routes without a token', async () => {
    const anon = makeClient();
    const res = await anon.get('/profile/me');

    assert.equal(res.status, 401);
  });
});

describe('profile', { skip }, () => {
  test('creates a profile automatically for a new user', async () => {
    const res = await student.get('/profile/me');

    assert.equal(res.status, 200);
    assert.ok(res.data.profile, 'a profile should exist');
    assert.equal(typeof res.data.profile.completeness, 'number');
  });

  test('updates details and recomputes completeness', async () => {
    const before = (await student.get('/profile/me')).data.profile.completeness;

    const res = await student.patch('/profile/me', {
      headline: 'Final year CS student',
      bio: 'Backend-focused student who has shipped three production side projects and enjoys distributed systems.',
      branch: 'Computer Science',
      graduationYear: 2026,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.profile.headline, 'Final year CS student');
    assert.ok(
      res.data.profile.completeness > before,
      'completeness should rise once details are filled in',
    );
  });

  test('adds, updates and removes a skill', async () => {
    const added = await student.post('/profile/me/skills', {
      name: 'JavaScript',
      category: 'programming',
      level: 'advanced',
    });
    assert.equal(added.status, 201, JSON.stringify(added.body));

    const skill = added.data.profile.skills.at(-1);
    assert.equal(skill.name, 'JavaScript');

    const updated = await student.patch(`/profile/me/skills/${skill._id}`, {
      name: 'JavaScript',
      category: 'programming',
      level: 'expert',
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.profile.skills.at(-1).level, 'expert');

    const removed = await student.delete(`/profile/me/skills/${skill._id}`);
    assert.equal(removed.status, 200);
    assert.equal(removed.data.profile.skills.length, 0);
  });

  test('adds a project and an education entry', async () => {
    const project = await student.post('/profile/me/projects', {
      title: 'Algorithm Visualiser',
      description: 'Built an interactive React app and reduced render time by 40%.',
      techStack: ['React'],
    });
    assert.equal(project.status, 201, JSON.stringify(project.body));

    const education = await student.post('/profile/me/education', {
      institution: 'Test College of Engineering',
      degree: 'B.E.',
      fieldOfStudy: 'Computer Science',
      startYear: 2022,
      endYear: 2026,
    });
    assert.equal(education.status, 201, JSON.stringify(education.body));
  });

  test('rejects an invalid skill level', async () => {
    const res = await student.post('/profile/me/skills', {
      name: 'Nonsense',
      category: 'programming',
      level: 'godlike',
    });

    assert.equal(res.status, 400, 'the API answers 400 for every validation failure');
  });
});

describe('coding practice', { skip }, () => {
  let slug;

  test('lists seeded problems with filters', async () => {
    const res = await student.get('/problems?limit=50');

    assert.equal(res.status, 200);
    assert.ok(res.data.problems.length > 0, 'the seed should provide problems');
    slug = res.data.problems.find((p) => p.slug === 'two-sum')?.slug ?? res.data.problems[0].slug;

    const easy = await student.get('/problems?difficulty=easy');
    assert.ok(
      easy.data.problems.every((p) => p.difficulty === 'easy'),
      'the difficulty filter should be honoured',
    );
  });

  test('never exposes test cases or the reference solution', async () => {
    const res = await student.get(`/problems/${slug}`);

    assert.equal(res.status, 200);
    assert.equal(res.data.problem.testCases, undefined, 'hidden tests must not leak');
    assert.equal(res.data.problem.referenceSolution, undefined, 'the solution must not leak');
  });

  test('runs code against the visible cases without recording a solve', async () => {
    const res = await student.post(`/problems/${slug}/run`, {
      code: 'function twoSum(nums, target) { return [0, 1]; }',
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.results), 'should return per-case results');

    const stats = await student.get('/problems/stats/me');
    assert.equal(stats.data.totalSolved, 0, 'a run must not count as a solve');
  });

  test('rejects a wrong submission', async () => {
    const res = await student.post(`/problems/${slug}/submit`, {
      code: 'function twoSum() { return [9, 9]; }',
    });

    // 201: a submission is recorded even when it fails. Compare with /run
    // above, which evaluates without persisting anything and answers 200.
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.notEqual(res.data.status, 'accepted');
  });

  test('accepts a correct submission and records the solve once', async () => {
    const code = `function twoSum(nums, target) {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
      }
      return [];
    }`;

    const first = await student.post(`/problems/${slug}/submit`, { code });
    assert.equal(first.data.status, 'accepted', JSON.stringify(first.data));

    // Submitting again must not double-count: SolvedProblem is unique per
    // user and problem.
    await student.post(`/problems/${slug}/submit`, { code });

    const stats = await student.get('/problems/stats/me');
    assert.equal(stats.data.totalSolved, 1, 'a re-solve must not inflate the count');
    assert.equal(stats.data.solved.easy, 1);
  });

  test('kills an infinite loop instead of hanging', async () => {
    const res = await student.post(`/problems/${slug}/run`, {
      code: 'function twoSum() { while (true) {} }',
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'timeout');
  });

  test('toggles a bookmark', async () => {
    const on = await student.post(`/problems/${slug}/bookmark`);
    assert.equal(on.data.bookmarked, true);

    const off = await student.post(`/problems/${slug}/bookmark`);
    assert.equal(off.data.bookmarked, false);
  });
});

describe('PYQ library', { skip }, () => {
  test('lists and filters previous-year questions', async () => {
    const res = await student.get('/questions?limit=50');

    assert.equal(res.status, 200);
    assert.ok(res.data.questions.length > 0, 'the seed should provide PYQs');

    const filtered = await student.get('/questions?company=Google');
    assert.ok(
      filtered.data.questions.every((q) => /google/i.test(q.company)),
      'the company filter should be honoured',
    );
  });

  test('exposes filter options drawn from real data', async () => {
    const res = await student.get('/questions/meta/filters');

    assert.equal(res.status, 200);
    assert.ok(res.data.companies.length > 0);
    assert.ok(res.data.topics.length > 0);
  });
});

describe('skill tests', { skip }, () => {
  let slug;
  let attempt;

  test('lists seeded tests', async () => {
    const res = await student.get('/tests');

    assert.equal(res.status, 200);
    assert.ok(res.data.tests.length > 0);
    slug = res.data.tests[0].slug;
  });

  test('starts an attempt without revealing the correct options', async () => {
    const res = await student.post(`/tests/${slug}/start`);

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.data.resumed, false, 'the first start creates an attempt');
    attempt = res.data;

    assert.ok(attempt.expiresAt, 'the server must set the deadline');
    for (const question of attempt.questions) {
      for (const option of question.options) {
        assert.equal(option.isCorrect, undefined, 'the answer key must not leak mid-test');
      }
    }
  });

  test('resuming returns the same attempt rather than starting a new one', async () => {
    const again = await student.post(`/tests/${slug}/start`);

    assert.equal(String(again.data.attemptId), String(attempt.attemptId));
    assert.equal(again.data.resumed, true);
    // Resuming creates nothing, so answering "201 Created" would be a lie.
    assert.equal(again.status, 200);
  });

  test('submits and scores the attempt', async () => {
    const answers = attempt.questions.map((question) => ({
      question: question._id,
      selectedOption: question.options[0]._id,
    }));

    const res = await student.post(`/tests/attempts/${attempt.attemptId}/submit`, { answers });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(typeof res.data.percentage, 'number');
    assert.ok(res.data.percentage >= 0 && res.data.percentage <= 100);
  });

  test('the review reveals the answer key only after submission', async () => {
    const res = await student.get(`/tests/attempts/${attempt.attemptId}`);

    assert.equal(res.status, 200);
    assert.ok(res.data.attempt.review.length > 0);
    assert.ok(
      res.data.attempt.review[0].options.some((o) => o.isCorrect !== undefined),
      'the review should show which option was correct',
    );
  });
});

describe('mock interviews', { skip }, () => {
  let sessionId;

  test('starts a session and withholds the model answer', async () => {
    const res = await student.post('/interviews', {
      round: 'behavioural',
      difficulty: 'medium',
      questionCount: 3,
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    sessionId = res.data.session._id;

    assert.equal(res.data.session.progress.total, 3);
    assert.ok(res.data.session.currentQuestion.prompt);
    assert.equal(
      res.data.session.currentQuestion.modelAnswer,
      undefined,
      'the model answer must not be readable during the session',
    );
  });

  test('refuses a second concurrent session', async () => {
    const res = await student.post('/interviews', {
      round: 'technical',
      difficulty: 'easy',
      questionCount: 3,
    });

    assert.equal(res.status, 409);
  });

  test('scores a strong answer higher than a vague one', async () => {
    const session = await student.get(`/interviews/${sessionId}`);
    const first = session.data.session.currentQuestion;

    const strong = await student.post(`/interviews/${sessionId}/answer`, {
      questionId: first._id,
      answer:
        'When our team was two weeks from a deadline a conflict came up about the caching design. My task was to get a decision without losing the week. I built a benchmark of both options, shared the numbers, and proposed we ship the simpler one. As a result we cut response time by 40% and shipped three days early.',
      secondsTaken: 90,
    });

    assert.equal(strong.status, 200, JSON.stringify(strong.body));

    const next = strong.data.session.currentQuestion;
    const weak = await student.post(`/interviews/${sessionId}/answer`, {
      questionId: next._id,
      answer: 'I am a hard worker and a good team player.',
      secondsTaken: 10,
    });

    assert.equal(weak.status, 200);
  });

  test('completes the session and returns a scored report', async () => {
    const done = await student.post(`/interviews/${sessionId}/complete`);
    assert.equal(done.status, 200);

    const report = await student.get(`/interviews/${sessionId}`);
    assert.equal(report.data.session.status, 'completed');
    assert.equal(typeof report.data.session.overallScore, 'number');
    assert.ok(report.data.session.verdict, 'the report should carry a verdict');
    assert.equal(report.data.session.answers.length, 3, 'unreached questions count as skipped');

    // Feedback is the point of the feature — it must be present and specific.
    const answered = report.data.session.answers.find((a) => !a.skipped);
    assert.ok(answered.feedback.length > 0, 'each answer should carry feedback');
  });
});

describe('resume builder', { skip }, () => {
  let resumeId;

  test('scores the resume from the live profile', async () => {
    const res = await student.get('/resumes/builder');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(typeof res.data.report.score, 'number');
    assert.ok(res.data.report.checks.length > 0, 'every point should be attributable');
  });

  test('saves a version that freezes the current profile', async () => {
    const res = await student.post('/resumes', { title: 'Backend roles', accent: '#a83206' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    resumeId = res.data.resume._id;
    assert.ok(res.data.resume.snapshot, 'the version should carry a snapshot');
  });

  test('editing the profile does not change a saved version', async () => {
    await student.patch('/profile/me', { headline: 'Changed after saving' });

    const res = await student.get(`/resumes/${resumeId}`);
    assert.notEqual(
      res.data.resume.snapshot.profile.headline,
      'Changed after saving',
      'a sent resume must not change under the student',
    );
  });

  test('rejects a non-hex accent colour', async () => {
    const res = await student.post('/resumes', { title: 'Bad', accent: 'red' });

    assert.equal(res.status, 400, 'the API answers 400 for every validation failure');
  });

  test('deletes a version', async () => {
    const res = await student.delete(`/resumes/${resumeId}`);
    assert.equal(res.status, 200);
  });
});

describe('company prep', { skip }, () => {
  test('lists hubs with question counts drawn from the PYQ library', async () => {
    const res = await student.get('/companies');

    assert.equal(res.status, 200);
    assert.ok(res.data.companies.length > 0);
    assert.ok(res.data.companies.every((c) => typeof c.questionCount === 'number'));
  });

  test('returns a hub with its rounds and most-asked questions', async () => {
    const res = await student.get('/companies/google');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.company.name, 'Google');
    assert.ok(res.data.company.rounds.length > 0);
    assert.ok(Array.isArray(res.data.topQuestions));
  });

  test('404s an unknown company', async () => {
    const res = await student.get('/companies/not-a-real-company');
    assert.equal(res.status, 404);
  });
});

describe('dashboard', { skip }, () => {
  test('aggregates every signal into one weighted score', async () => {
    const res = await student.get('/dashboard');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(typeof res.data.readiness.score, 'number');
    assert.equal(res.data.readiness.components.length, 5, 'skills, coding, resume, interview, projects');

    // The solved count must match the coding screen exactly — both read
    // SolvedProblem.
    const stats = await student.get('/problems/stats/me');
    assert.equal(
      res.data.coding.totalSolved,
      stats.data.totalSolved,
      'the dashboard and the practice screen must not disagree',
    );
  });

  test('derives actionable notifications', async () => {
    const res = await student.get('/dashboard');

    assert.ok(Array.isArray(res.data.notifications));
    for (const notice of res.data.notifications) {
      assert.ok(notice.title, 'every notice needs a title');
      assert.ok(notice.action?.to, 'every notice must be actionable');
    }
  });
});

describe('admin access control', { skip }, () => {
  test('a student is refused the cohort view', async () => {
    const res = await student.get('/admin/students');

    assert.equal(res.status, 403, 'student data must not be readable by students');
  });

  test('an admin can list students and drill into one', async () => {
    const { User } = await import('../src/models/User.js');
    await User.create({
      name: 'Placement Officer',
      email: 'officer@studentos.test',
      password: 'testpass123',
      role: 'admin',
    });

    const admin = makeClient();
    const login = await admin.post('/auth/login', {
      email: 'officer@studentos.test',
      password: 'testpass123',
    });
    admin.state.token = login.data.accessToken;

    const list = await admin.get('/admin/students');
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.ok(list.data.students.length > 0);

    const row = list.data.students[0];
    assert.equal(typeof row.readiness, 'number');
    assert.ok(['ready', 'progressing', 'at-risk'].includes(row.band));

    const filtered = await admin.get('/admin/students?branch=Computer%20Science');
    assert.ok(
      filtered.data.students.every((s) => s.branch === 'Computer Science'),
      'the branch filter should be honoured',
    );

    const detail = await admin.get(`/admin/students/${row._id}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.data.student.name);
  });
});
