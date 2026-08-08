import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import {
  makeClient,
  signUp,
  startHarness,
  stopHarness,
} from './helpers/integrationHarness.js';

/**
 * Real-database coverage for the staff features.
 *
 * These were built with unit tests over pure services, which is where the
 * scoring rules belong — but nothing had exercised the wiring: routes,
 * role gates, populate paths, sub-document updates and index builds. The
 * first run of this file found a duplicate-index conflict that took the
 * whole seed down, which no amount of unit testing would have caught.
 */
const harness = await startHarness('admin');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

const staff = makeClient(harness);
const student = makeClient(harness);
const outsider = makeClient(harness);

const stamp = Date.now();
const staffEmail = `officer${stamp}@studentos.test`;
const studentEmail = `learner${stamp}@studentos.test`;

let studentId;

describe('staff setup', { skip }, () => {
  test('a placement officer and a student can be created', async () => {
    const officer = await signUp(staff, {
      name: 'Placement Officer',
      email: staffEmail,
      role: 'admin',
    });
    assert.equal(officer.status, 201, JSON.stringify(officer.body));
    assert.ok(staff.state.token, 'the officer must end up authenticated');

    const learner = await signUp(student, { name: 'Asha Learner', email: studentEmail });
    assert.equal(learner.status, 201);
    studentId = learner.data.user._id ?? learner.data.user.id;
    assert.ok(studentId);

    await signUp(outsider, { name: 'Nosy Student', email: `nosy${stamp}@studentos.test` });
  });

  test('a student cannot reach the staff areas', async () => {
    for (const path of ['/offers', '/recruiters', '/trainings', '/calendar']) {
      const res = await outsider.get(path);
      assert.equal(res.status, 403, `${path} must be staff only, got ${res.status}`);
    }
  });
});

describe('offers and the placement report', { skip }, () => {
  let offerId;

  test('records an offer against a real student', async () => {
    const res = await staff.post('/offers', {
      student: studentId,
      company: 'Infosys',
      role: 'Systems Engineer',
      ctc: 650000,
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    offerId = res.data.offer._id;
    assert.equal(res.data.offer.status, 'offered');
    assert.equal(res.data.offer.student.name, 'Asha Learner', 'the student should be populated');
  });

  test('refuses an offer for someone who is not a student', async () => {
    const res = await staff.post('/offers', {
      student: '65f000000000000000000999',
      company: 'Ghost Corp',
      role: 'Nobody',
    });

    assert.equal(res.status, 404);
  });

  test('an offered-but-unaccepted student is not counted as placed', async () => {
    const res = await staff.get('/offers/report');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.totals.offers, 1);
    assert.equal(res.data.totals.placed, 0, '"offered" is not a placement until they say yes');
  });

  test('accepting the offer places the student', async () => {
    const patch = await staff.patch(`/offers/${offerId}`, { status: 'accepted' });
    assert.equal(patch.status, 200, JSON.stringify(patch.body));

    const report = await staff.get('/offers/report');
    assert.equal(report.data.totals.placed, 1);
    assert.equal(report.data.salary.median, 650000);
    assert.ok(report.data.totals.placementRate > 0);
  });

  test('a second offer to the same student is still one placement', async () => {
    // The rule the whole report rests on, checked through the real
    // aggregation rather than over a fixture array.
    const second = await staff.post('/offers', {
      student: studentId,
      company: 'TCS',
      role: 'Digital',
      ctc: 900000,
      status: 'accepted',
    });
    assert.equal(second.status, 201);

    const report = await staff.get('/offers/report');
    assert.equal(report.data.totals.offers, 2);
    assert.equal(report.data.totals.placed, 1, 'two offers, one student, one placement');
    assert.equal(report.data.totals.offersPerPlacedStudent, 2);
  });

  test('deletes an offer', async () => {
    const res = await staff.delete(`/offers/${offerId}`);
    assert.equal(res.status, 200);

    const report = await staff.get('/offers/report');
    assert.equal(report.data.totals.offers, 1);
  });
});

describe('placement calendar', { skip }, () => {
  let eventId;

  test('creates an event', async () => {
    const start = new Date(Date.now() + 3 * 86_400_000);
    const res = await staff.post('/calendar', {
      title: 'Infosys interviews',
      type: 'interview',
      company: 'Infosys',
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3 * 3_600_000).toISOString(),
      venue: 'Block C',
      audience: 'shortlist',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    eventId = res.data.event._id;
  });

  test('refuses an event that ends before it starts', async () => {
    const start = new Date(Date.now() + 86_400_000);
    const res = await staff.post('/calendar', {
      title: 'Backwards',
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() - 3_600_000).toISOString(),
    });

    assert.equal(res.status, 400);
  });

  test('the calendar groups events into days and reports no clashes yet', async () => {
    const res = await staff.get('/calendar');

    assert.equal(res.status, 200);
    assert.ok(res.data.days.length >= 1);
    assert.deepEqual(res.data.conflicts, []);
  });

  test('a slot added to the event reaches the student agenda with their own time', async () => {
    const slotStart = new Date(Date.now() + 3 * 86_400_000 + 2 * 3_600_000);

    // Written through the model, since slot generation needs a drive and the
    // point here is the agenda projection rather than the scheduler.
    const { PlacementEvent } = await import('../src/models/PlacementEvent.js');
    await PlacementEvent.updateOne(
      { _id: eventId },
      {
        $push: {
          slots: {
            student: studentId,
            startsAt: slotStart,
            endsAt: new Date(slotStart.getTime() + 1_800_000),
            panel: 2,
            venue: 'Room 4',
          },
        },
      },
    );

    const agenda = await student.get('/calendar/me');

    assert.equal(agenda.status, 200, JSON.stringify(agenda.body));
    assert.equal(agenda.data.agenda.length, 1);
    assert.equal(agenda.data.agenda[0].slot.panel, 2);
    assert.equal(
      new Date(agenda.data.agenda[0].startsAt).toISOString(),
      slotStart.toISOString(),
      'the personal slot time must beat the event start time',
    );
    assert.equal(agenda.data.agenda[0].venue, 'Room 4');
  });

  test('a student with no slot does not see a shortlist event', async () => {
    const agenda = await outsider.get('/calendar/me');

    assert.equal(agenda.status, 200);
    assert.deepEqual(agenda.data.agenda, [], 'otherwise everyone sees every interview day');
  });

  test('a double booking is surfaced on the officer calendar', async () => {
    const clashStart = new Date(Date.now() + 3 * 86_400_000 + 2 * 3_600_000 + 600_000);

    const second = await staff.post('/calendar', {
      title: 'TCS interviews',
      type: 'interview',
      company: 'TCS',
      startsAt: clashStart.toISOString(),
      endsAt: new Date(clashStart.getTime() + 3_600_000).toISOString(),
    });

    const { PlacementEvent } = await import('../src/models/PlacementEvent.js');
    await PlacementEvent.updateOne(
      { _id: second.data.event._id },
      {
        $push: {
          slots: {
            student: studentId,
            startsAt: clashStart,
            endsAt: new Date(clashStart.getTime() + 1_800_000),
          },
        },
      },
    );

    const res = await staff.get('/calendar');
    assert.equal(res.data.conflicts.length, 1, 'one student, two companies, same half hour');
    assert.equal(String(res.data.conflicts[0].student), String(studentId));

    // And the student is told, not just the officer.
    const agenda = await student.get('/calendar/me');
    assert.equal(agenda.data.clashes, 2, 'both sides of the clash are flagged');
  });
});

describe('company CRM', { skip }, () => {
  let recruiterId;

  test('creates a company record', async () => {
    const res = await staff.post('/recruiters', {
      name: 'Infosys',
      industry: 'IT services',
      status: 'active',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    recruiterId = res.data.recruiter._id;
  });

  /** The unique index is case-insensitive, which only a real index enforces. */
  test('refuses a duplicate company however it is cased', async () => {
    const res = await staff.post('/recruiters', { name: 'INFOSYS' });

    assert.equal(res.status, 409, JSON.stringify(res.body));
  });

  test('records feedback and aggregates it into themes', async () => {
    const first = await staff.post(`/recruiters/${recruiterId}/feedback`, {
      rating: 3,
      gaps: ['communication', 'dsa'],
      strengths: ['projects'],
    });
    assert.equal(first.status, 201, JSON.stringify(first.body));

    const other = await staff.post('/recruiters', { name: 'Zoho', status: 'active' });
    await staff.post(`/recruiters/${other.data.recruiter._id}/feedback`, {
      rating: 4,
      gaps: ['communication'],
      strengths: [],
    });

    const list = await staff.get('/recruiters');
    const communication = list.data.summary.gaps.find((gap) => gap.key === 'communication');

    assert.equal(communication.recruiters, 2);
    assert.deepEqual(communication.companies, ['Infosys', 'Zoho']);
    assert.equal(
      list.data.recommendations[0].id,
      'recruiter-communication',
      'two companies naming the same gap is a fundable theme',
    );
  });

  test('rejects feedback tagged outside the shared vocabulary', async () => {
    const res = await staff.post(`/recruiters/${recruiterId}/feedback`, {
      rating: 3,
      gaps: ['vibes'],
    });

    assert.equal(res.status, 400);
  });

  test('relationship health is derived from the drives and offers tables', async () => {
    const res = await staff.get(`/recruiters/${recruiterId}`);

    assert.equal(res.status, 200);
    // One accepted Infosys offer survives from the offers suite above.
    assert.equal(res.data.health.hired, 0, 'that offer was deleted');
    assert.equal(res.data.health.visits, 0);
    assert.equal(res.data.health.stale, true, 'never visited is stale');
  });
});

describe('training and attendance', { skip }, () => {
  let trainingId;

  test('schedules a session', async () => {
    const start = new Date(Date.now() - 3_600_000);
    const res = await staff.post('/trainings', {
      title: 'DSA bootcamp',
      type: 'bootcamp',
      targetComponent: 'coding',
      provider: 'external',
      cost: 50000,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 4 * 3_600_000).toISOString(),
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    trainingId = res.data.session._id;
  });

  test('enrols a student and does not duplicate on re-enrol', async () => {
    const first = await staff.post(`/trainings/${trainingId}/enrol`, { students: [studentId] });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.data.enrolled, 1);

    const again = await staff.post(`/trainings/${trainingId}/enrol`, { students: [studentId] });
    assert.equal(again.data.enrolled, 1, 're-enrolling must not create a second roll entry');
  });

  test('a student checks in with the live code', async () => {
    const code = await staff.get(`/trainings/${trainingId}/checkin-code`);

    assert.equal(code.status, 200, JSON.stringify(code.body));
    assert.equal(code.data.window.open, true);
    assert.equal(code.data.expected, 1);

    const res = await student.post(`/trainings/${trainingId}/checkin`, { code: code.data.code });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.alreadyIn, false);
  });

  test('scanning twice is a success, not an error', async () => {
    const code = await staff.get(`/trainings/${trainingId}/checkin-code`);
    const res = await student.post(`/trainings/${trainingId}/checkin`, { code: code.data.code });

    assert.equal(res.status, 200);
    assert.equal(res.data.alreadyIn, true, 'a second scan must not look like a failure');
  });

  test('a wrong code is refused', async () => {
    const res = await student.post(`/trainings/${trainingId}/checkin`, { code: 'ZZZZZZZZ' });

    assert.equal(res.status, 400);
  });

  test('a student not on the roll cannot check in with a valid code', async () => {
    // The guard that stops a leaked code conjuring attendance.
    const code = await staff.get(`/trainings/${trainingId}/checkin-code`);
    const res = await outsider.post(`/trainings/${trainingId}/checkin`, { code: code.data.code });

    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  test('a student cannot generate the code themselves', async () => {
    const res = await student.get(`/trainings/${trainingId}/checkin-code`);

    assert.equal(res.status, 403, 'handing the generator to students defeats the whole mechanism');
  });

  test('attendance is reflected in the roll', async () => {
    const res = await staff.get(`/trainings/${trainingId}`);

    assert.equal(res.data.attendanceSummary.attended, 1);
    assert.equal(res.data.attendanceSummary.rate, 100);
  });

  test('effectiveness refuses to report before the window closes', async () => {
    const res = await staff.get(`/trainings/${trainingId}/effectiveness`);

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.effectiveness.measurable, false);
    assert.match(res.data.effectiveness.reason, /has not closed yet/);
    assert.ok(res.data.effectiveness.caveat, 'the caveat rides along even with no result');
  });
});

describe('student achievements and settings', { skip }, () => {
  test('achievements are derived and start empty', async () => {
    const res = await student.get('/dashboard/achievements');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.data.level.level, 1);
    assert.equal(res.data.totals.earned, 0, 'nothing is awarded for signing up');
    assert.ok(res.data.badges.every((badge) => badge.next), 'every locked badge shows its target');
  });

  test('notification preferences round-trip and filter the dashboard', async () => {
    const before = await student.get('/dashboard');
    const hadProfileNotice = before.data.notifications.some((notice) =>
      ['profile-incomplete', 'needs-projects'].includes(notice.id),
    );
    assert.equal(hadProfileNotice, true, 'a new account should be nudged about its profile');

    const saved = await student.patch('/auth/settings', { notifications: { profile: false } });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.data.notifications.profile, false);

    const after = await student.get('/dashboard');
    assert.equal(
      after.data.notifications.some((notice) =>
        ['profile-incomplete', 'needs-projects'].includes(notice.id),
      ),
      false,
      'turning the category off must hide every notice in it',
    );
  });

  test('every notification carries a working destination', async () => {
    // The bug this catches shipped: the weakest-area notice keyed a route map
    // by stale component names and produced a button pointing at undefined.
    const res = await student.get('/dashboard');

    for (const notice of res.data.notifications) {
      assert.ok(notice.action?.to, `${notice.id} has no destination`);
      assert.match(notice.action.to, /^\//, `${notice.id} must link somewhere real`);
    }
  });

  test('signed-in devices list the current session', async () => {
    const res = await student.get('/auth/sessions');

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.data.sessions.length >= 1);
    assert.equal(res.data.sessions.some((session) => session.current), true);
    assert.ok(res.data.sessions.every((session) => session.device));
  });

  test('changing the password signs other devices out', async () => {
    const second = makeClient(harness);
    const login = await second.post('/auth/login', {
      email: studentEmail,
      password: 'password123',
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));

    const changed = await student.patch('/auth/password', {
      currentPassword: 'password123',
      newPassword: 'a-much-longer-password-9',
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));

    // The other device's refresh token is gone, so it cannot get a new
    // access token even though its cookie still looks valid.
    const refreshed = await second.post('/auth/refresh');
    assert.equal(refreshed.status, 401, 'a changed password must end other sessions');
  });
});
