import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { Announcement } from '../src/models/Announcement.js';
import { AUDIENCE_TYPES, describeAudience, resolveAudience } from '../src/services/audience.js';
import { summariseDelivery } from '../src/services/mailer.js';

const id = () => new mongoose.Types.ObjectId();

const student = (overrides = {}) => ({
  _id: id(),
  name: 'Student',
  email: `s${Math.random().toString(36).slice(2)}@studentos.test`,
  branch: 'Computer Science',
  graduationYear: 2026,
  band: 'progressing',
  ...overrides,
});

const COHORT = [
  student({ branch: 'Computer Science', graduationYear: 2026, band: 'ready' }),
  student({ branch: 'Computer Science', graduationYear: 2027, band: 'at-risk' }),
  student({ branch: 'Information Technology', graduationYear: 2026, band: 'progressing' }),
  student({ branch: 'Mechanical', graduationYear: 2026, band: 'at-risk' }),
];

test('the whole cohort is reachable', () => {
  const { recipients } = resolveAudience({ type: 'all' }, { cohort: COHORT });

  assert.equal(recipients.length, 4);
});

test('a department is matched exactly, not by prefix', () => {
  // "starts with" would make Computer Science also select
  // "Computer Science and Design", which is a different department.
  const cohort = [
    ...COHORT,
    student({ branch: 'Computer Science and Design' }),
  ];

  const { recipients } = resolveAudience({ type: 'branch', branch: 'Computer Science' }, { cohort });

  assert.equal(recipients.length, 2);
  assert.ok(recipients.every((row) => row.branch === 'Computer Science'));
});

test('a department is matched case and whitespace insensitively', () => {
  const { recipients } = resolveAudience(
    { type: 'branch', branch: '  computer science  ' },
    { cohort: COHORT },
  );

  assert.equal(recipients.length, 2);
});

test('a batch is matched by graduation year', () => {
  const { recipients } = resolveAudience(
    { type: 'year', graduationYear: 2026 },
    { cohort: COHORT },
  );

  assert.equal(recipients.length, 3);
});

test('a readiness band is matched', () => {
  const { recipients } = resolveAudience({ type: 'band', band: 'at-risk' }, { cohort: COHORT });

  assert.equal(recipients.length, 2);
});

test('chosen students are matched by id', () => {
  const wanted = [COHORT[0]._id, COHORT[2]._id];

  const { recipients } = resolveAudience(
    { type: 'selected', students: wanted.map(String) },
    { cohort: COHORT },
  );

  assert.deepEqual(
    recipients.map((row) => String(row._id)).sort(),
    wanted.map(String).sort(),
  );
});

test("a drive's shortlist is matched", () => {
  const { recipients } = resolveAudience(
    { type: 'drive', drive: String(id()) },
    { cohort: COHORT, driveShortlist: [COHORT[1]._id] },
  );

  assert.equal(recipients.length, 1);
  assert.equal(String(recipients[0]._id), String(COHORT[1]._id));
});

/**
 * The rule the whole module exists for. A filter that cannot be resolved
 * must reach nobody — a "you have been shortlisted" message sent to the
 * entire college cannot be taken back.
 */
test('an unresolvable audience reaches nobody, never everybody', () => {
  const cases = [
    [{ type: 'branch' }, /department/i],
    [{ type: 'year' }, /batch/i],
    [{ type: 'band' }, /band/i],
    [{ type: 'selected' }, /students/i],
    [{ type: 'selected', students: [] }, /students/i],
    [{ type: 'nonsense' }, /unknown/i],
    [{}, /unknown/i],
    [undefined, /unknown/i],
  ];

  for (const [audience, reason] of cases) {
    const result = resolveAudience(audience, { cohort: COHORT });

    assert.deepEqual(result.recipients, [], `${JSON.stringify(audience)} must match nobody`);
    assert.match(result.reason, reason);
  }
});

/**
 * A missing drive is not an empty drive. Falling through to the cohort here
 * would be the single most damaging bug this feature could have.
 */
test('a drive that could not be loaded reaches nobody', () => {
  const result = resolveAudience(
    { type: 'drive', drive: String(id()) },
    { cohort: COHORT, driveShortlist: null },
  );

  assert.deepEqual(result.recipients, []);
  assert.match(result.reason, /could not be found/);
});

test('a drive with a genuinely empty shortlist is distinguishable from a missing one', () => {
  const result = resolveAudience(
    { type: 'drive', drive: String(id()) },
    { cohort: COHORT, driveShortlist: [] },
  );

  assert.deepEqual(result.recipients, []);
  assert.equal(result.reason, null, 'empty is a valid answer; missing is an error');
});

test('a filter matching nobody is not an error, just an empty result', () => {
  const result = resolveAudience({ type: 'branch', branch: 'Civil' }, { cohort: COHORT });

  assert.deepEqual(result.recipients, []);
  assert.equal(result.reason, null);
});

test('an empty cohort resolves to nobody without throwing', () => {
  for (const type of AUDIENCE_TYPES.map((entry) => entry.key)) {
    const result = resolveAudience({ type, branch: 'X', graduationYear: 2026, band: 'ready', students: [String(id())] }, { cohort: [], driveShortlist: [] });
    assert.deepEqual(result.recipients, [], type);
  }
});

test('a student with no branch is not swept into a department filter', () => {
  const cohort = [student({ branch: '' }), student({ branch: undefined })];

  const { recipients } = resolveAudience({ type: 'branch', branch: 'Computer Science' }, { cohort });

  assert.deepEqual(recipients, []);
});

test('an audience describes itself for the confirm step', () => {
  assert.equal(describeAudience({ type: 'all' }), 'every student');
  assert.equal(describeAudience({ type: 'branch', branch: 'IT' }), 'students in IT');
  assert.equal(describeAudience({ type: 'year', graduationYear: 2026 }), 'the class of 2026');
  assert.match(describeAudience({ type: 'band', band: 'at-risk' }), /at-risk/);
  assert.equal(describeAudience({ type: 'selected', students: [1, 2] }), '2 chosen students');
  assert.equal(describeAudience({ type: 'nonsense' }), 'nobody');
  assert.equal(describeAudience(undefined), 'nobody');
});

test('a delivery report separates sent, failed and never-attempted', () => {
  // The three must never be conflated: "skipped" means no email was even
  // tried, which is a different thing from one that bounced.
  const summary = summariseDelivery([
    { email: 'a@x.test', status: 'sent' },
    { email: 'b@x.test', status: 'sent' },
    { email: 'c@x.test', status: 'failed', error: 'mailbox full' },
    { email: 'd@x.test', status: 'skipped', error: 'SMTP is not configured' },
  ]);

  assert.deepEqual(summary, { total: 4, sent: 2, failed: 1, skipped: 1 });
});

test('an empty delivery report is all zeroes', () => {
  assert.deepEqual(summariseDelivery([]), { total: 0, sent: 0, failed: 0, skipped: 0 });
});

test('an announcement requires a subject, a body and an audience type', () => {
  const error = new Announcement({}).validateSync();

  assert.ok(error.errors.subject);
  assert.ok(error.errors.body);
  assert.ok(error.errors['audience.type']);
});

test('an announcement rejects an audience type outside the list', () => {
  const announcement = new Announcement({
    subject: 'Hello',
    body: 'Body',
    audience: { type: 'everyone-everywhere' },
  });

  assert.ok(announcement.validateSync());
});

test('delivery counts are derived, so they cannot drift from the recipients', () => {
  const announcement = new Announcement({
    subject: 'Drive tomorrow',
    body: 'Report at 9am.',
    audience: { type: 'all' },
    recipients: [
      { student: id(), email: 'a@x.test', delivery: 'sent', readAt: new Date() },
      { student: id(), email: 'b@x.test', delivery: 'sent' },
      { student: id(), email: 'c@x.test', delivery: 'failed' },
      { student: id(), email: 'd@x.test', delivery: 'skipped' },
    ],
  });

  assert.equal(announcement.delivery.total, 4);
  assert.equal(announcement.delivery.sent, 2);
  assert.equal(announcement.delivery.failed, 1);
  assert.equal(announcement.delivery.skipped, 1);
  assert.equal(announcement.delivery.read, 1);
});

test('a recipient defaults to skipped rather than sent', () => {
  // The safe default: an unset delivery state must never read as success.
  const announcement = new Announcement({
    subject: 'x',
    body: 'y',
    audience: { type: 'all' },
    recipients: [{ student: id(), email: 'a@x.test' }],
  });

  assert.equal(announcement.recipients[0].delivery, 'skipped');
});

test('every audience type carries a label for the composer', () => {
  const keys = AUDIENCE_TYPES.map((entry) => entry.key);

  assert.equal(new Set(keys).size, keys.length);
  assert.ok(AUDIENCE_TYPES.every((entry) => entry.label && entry.label !== entry.key));
});
