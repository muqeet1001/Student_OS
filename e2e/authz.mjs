/**
 * Authorization probe.
 *
 * Unit tests assert that middleware rejects the wrong role. This asks a
 * different question against a running server holding a real cohort: given a
 * valid student session and the id of something belonging to somebody else,
 * does the API hand it over?
 *
 * That is the failure mode that matters here. This system holds a cohort's
 * offers, interview scores and placement status. A missing `requireRole` is
 * caught by a unit test; an endpoint that checks authentication but forgets
 * to scope the query to `req.user._id` is not — it returns 200 with another
 * student's data and looks perfectly healthy.
 *
 * Run against a server seeded with the demo cohort:
 *   node e2e/authz.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:5099';
const API = `${BASE}/api`;

const failures = [];
const notes = [];

async function call(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(API + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* Non-JSON body; status carries the result. */
  }

  return { status: response.status, data: payload?.data, body: payload };
}

async function login(email, password = 'demo1234') {
  const res = await call('/auth/login', { method: 'POST', body: { email, password } });
  if (!res.data?.accessToken) throw new Error(`login failed for ${email}: ${res.status}`);
  return { token: res.data.accessToken, user: res.data.user };
}

/** Anything but 2xx is a pass — the request was refused, which is the point. */
function mustRefuse(label, { status }) {
  if (status >= 200 && status < 300) {
    failures.push(`${label}: returned ${status} — the request should have been refused`);
  } else {
    notes.push(`  ✓ ${label} → ${status}`);
  }
}

function mustAllow(label, { status }) {
  if (status < 200 || status >= 300) {
    failures.push(`${label}: returned ${status} — this should have been allowed`);
  } else {
    notes.push(`  ✓ ${label} → ${status}`);
  }
}

const STAFF_ONLY = [
  '/admin/analytics',
  '/admin/students',
  '/admin/students/filters',
  '/drives',
  '/offers',
  '/calendar',
  '/recruiters',
  '/trainings',
  '/announcements',
];

async function main() {
  const student = await login('demo@studentos.com');
  const admin = await login('admin@studentos.com');

  console.log('Signed in as student and admin.\n');

  // 1. Staff surfaces must be closed to students.
  for (const path of STAFF_ONLY) {
    mustRefuse(`student GET ${path}`, await call(path, { token: student.token }));
  }

  // 2. …and open to staff, or the check above proves nothing.
  for (const path of STAFF_ONLY) {
    mustAllow(`admin GET ${path}`, await call(path, { token: admin.token }));
  }

  // 3. No token at all.
  mustRefuse('anonymous GET /dashboard', await call('/dashboard'));
  mustRefuse('anonymous GET /admin/analytics', await call('/admin/analytics'));
  mustRefuse('garbage token GET /dashboard', await call('/dashboard', { token: 'not.a.jwt' }));

  /*
   * 4. Mass assignment.
   *
   * These are checked by outcome, not by status code. The validator strips
   * fields it does not know about, so the write is accepted and the extra
   * field is silently dropped — a 200 here is not evidence of a hole, and
   * asserting on the status would fail on a system that is behaving
   * correctly. What matters is the state afterwards.
   */
  await call('/profile/me', { token: student.token, method: 'PATCH', body: { role: 'admin' } });
  await call('/profile/me/account', { token: student.token, method: 'PATCH', body: { role: 'admin' } });

  const after = await call('/auth/me', { token: student.token });
  if (after.data?.user?.role !== 'student') {
    failures.push(`PRIVILEGE ESCALATION: student role is now "${after.data?.user?.role}"`);
  } else {
    notes.push('  ✓ role survives being sent to both profile endpoints');
  }

  /*
   * The integrity check that matters most. A verified skill outranks a
   * declared one in job matching and in the admin shortlist, and the only
   * thing that is supposed to set it is passing an assessment. If it can be
   * set by writing to your own profile, every "verified" badge in the system
   * is worthless and the shortlists built on them are wrong.
   */
  const fabricated = `ZZTestSkill${Date.now()}`;
  await call('/profile/me/skills', {
    token: student.token,
    method: 'POST',
    body: { name: fabricated, category: 'programming', level: 'expert', verified: true },
  });

  const profile = await call('/profile/me', { token: student.token });
  const planted = (profile.data?.profile?.skills ?? []).find((skill) => skill.name === fabricated);

  if (!planted) {
    notes.push('  ✓ fabricated skill was rejected outright');
  } else if (planted.verified) {
    failures.push('INTEGRITY: a student marked their own skill verified without passing a test');
  } else {
    notes.push('  ✓ self-declared skill was stored unverified');

    // Removed again so the probe can be run repeatedly without slowly
    // filling the demo account's profile with its own test data.
    await call(`/profile/me/skills/${planted._id}`, { token: student.token, method: 'DELETE' });
  }

  /*
   * 5. Another student's records, by id.
   *
   * The ids come from the admin's own view of the cohort, which is how an
   * attacker would get them too — they appear in shared links, exports and
   * screenshots. Each of these endpoints authenticates fine; the question is
   * whether it scopes the query to the caller.
   */
  const cohort = await call('/admin/students?limit=5', { token: admin.token });
  const other = (cohort.data?.students ?? []).find(
    (row) => String(row.user?._id ?? row.user ?? row._id) !== String(student.user.id ?? student.user._id),
  );

  if (!other) {
    failures.push('could not find another student in the cohort — probe 5 did not run');
  } else {
    const otherId = String(other.user?._id ?? other.user ?? other._id);

    mustRefuse(
      `student GET /admin/students/${otherId.slice(0, 8)}…`,
      await call(`/admin/students/${otherId}`, { token: student.token }),
    );
  }

  // 6. A student's own data must still work, or the checks above are just a
  //    broken API rather than a secure one.
  mustAllow('student GET /dashboard', await call('/dashboard', { token: student.token }));
  mustAllow('student GET /resumes', await call('/resumes', { token: student.token }));
  mustAllow('student GET /announcements/me', await call('/announcements/me', { token: student.token }));
  mustAllow('student GET /calendar/me', await call('/calendar/me', { token: student.token }));

  console.log(notes.join('\n'));
  console.log(`\nRan ${notes.length + failures.length} checks.`);

  if (failures.length) {
    console.log(`\n${failures.length} FAILURES:\n`);
    for (const failure of failures) console.log(`  ✗ ${failure}`);
    process.exit(1);
  }

  console.log('No authorization holes found.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
