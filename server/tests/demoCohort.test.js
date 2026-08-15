import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { User } from '../src/models/User.js';
import { Profile } from '../src/models/Profile.js';
import { Offer } from '../src/models/Offer.js';
import { buildCohort, DEMO_EMAIL_DOMAIN, __testing } from '../src/seed/demo.js';
import { buildAlumniStats } from '../src/services/alumniStats.js';

const { planOffers, makeRandom, RATE_BY_OFFSET, BATCH_SIZE } = __testing;

const NOW = new Date('2026-06-01T00:00:00Z');

/** Cohort plus offers, with student ids stubbed in as the writer would. */
function plan(seed = 1234) {
  const cohort = buildCohort({ now: NOW });
  cohort.students.forEach((student, index) => {
    student.id = `student-${index}`;
  });

  return { cohort, offers: planOffers(cohort, makeRandom(seed)) };
}

test('every demo address sits on a domain that can never receive mail', () => {
  const { cohort } = plan();

  for (const student of cohort.students) {
    assert.ok(
      student.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`),
      `${student.email} is not on the demo domain`,
    );
  }

  /*
   * The point of the check above is this one. Announcements really send email
   * when SMTP is configured, and `.invalid` is reserved by RFC 2606 so it can
   * never resolve. A demo cohort on a domain that resolves would mean a
   * broadcast reaching whoever owns it.
   */
  assert.ok(DEMO_EMAIL_DOMAIN.endsWith('.invalid'));
});

test('the cohort is deterministic, so a demo looks the same on every machine', () => {
  const first = buildCohort({ now: NOW });
  const second = buildCohort({ now: NOW });

  assert.deepEqual(
    first.students.map((student) => student.email),
    second.students.map((student) => student.email),
  );
});

test('emails are unique — a collision would be a duplicate account', () => {
  const { cohort } = plan();
  const emails = new Set(cohort.students.map((student) => student.email));

  assert.equal(emails.size, cohort.students.length);
});

test('the cohort spans three finished batches and one still being placed', () => {
  const { cohort } = plan();

  assert.equal(cohort.batches.length, 4);
  assert.deepEqual(cohort.batches, [2023, 2024, 2025, 2026]);

  for (const year of cohort.batches) {
    const batch = cohort.students.filter((student) => student.graduationYear === year);
    assert.equal(batch.length, BATCH_SIZE, `batch ${year}`);
  }
});

test('every student is complete enough to render a profile', () => {
  const { cohort } = plan();

  for (const student of cohort.students) {
    assert.ok(student.name.length >= 2, student.email);
    assert.ok(student.branch, student.email);
    assert.ok(student.skills.length >= 3, `${student.email} has ${student.skills.length} skills`);
    assert.ok(student.targetRole, student.email);
  }
});

test('each batch is placed at exactly the rate the constant declares', () => {
  const { cohort, offers } = plan();

  for (const year of cohort.batches) {
    const offset = cohort.currentYear - year;
    const placed = new Set(
      offers
        .filter((offer) => offer.graduationYear === year)
        .filter((offer) => ['accepted', 'joined'].includes(offer.status))
        .map((offer) => offer.student),
    );

    /*
     * Guards the distinction that already went wrong once: the constant names
     * a placement rate, not an offer rate. When declines were allowed to eat
     * into it, a batch labelled 61% rendered as 44%.
     */
    assert.equal(
      placed.size,
      Math.round(RATE_BY_OFFSET[offset] * BATCH_SIZE),
      `batch ${year} placement count`,
    );
  }
});

test('more offers than placements, so the two are visibly different numbers', () => {
  const { offers } = plan();

  const placed = new Set(
    offers.filter((o) => ['accepted', 'joined'].includes(o.status)).map((o) => o.student),
  );

  assert.ok(offers.length > placed.size, 'every offer was accepted — the status breakdown has one bar');

  const statuses = new Set(offers.map((offer) => offer.status));
  assert.ok(statuses.has('declined'));
  assert.ok(statuses.has('offered'), 'the current batch should still hold undecided offers');
});

test('nobody joins a company before they graduate', () => {
  const { cohort, offers } = plan();

  for (const offer of offers.filter((o) => o.graduationYear === cohort.currentYear)) {
    assert.notEqual(offer.status, 'joined', 'the current batch has not graduated yet');
  }
});

test('the placement trend rises across the finished batches', () => {
  const { cohort, offers } = plan();

  const profiles = cohort.students.map((student) => ({
    user: student.id,
    graduationYear: student.graduationYear,
    branch: student.branch,
  }));

  const stats = buildAlumniStats({ profiles, offers, now: NOW });
  const finished = stats.years.filter((year) => !year.inProgress);

  assert.equal(finished.length, 3);
  assert.ok(stats.trend, 'three finished batches should produce a trend');

  // Ascending as the constant intends, so the page has a direction to show.
  for (let index = 0; index < finished.length - 1; index += 1) {
    assert.ok(
      finished[index].placementRate > finished[index + 1].placementRate,
      `${finished[index].graduationYear} should beat ${finished[index + 1].graduationYear}`,
    );
  }

  const current = stats.years.find((year) => year.graduationYear === cohort.currentYear);
  assert.equal(current.inProgress, true);
});

test('generated students and offers satisfy their schemas', () => {
  const { cohort, offers } = plan();
  const objectId = new mongoose.Types.ObjectId();

  for (const student of cohort.students.slice(0, 5)) {
    const error = new User({
      name: student.name,
      email: student.email,
      password: 'x'.repeat(60),
      role: 'student',
    }).validateSync();
    assert.equal(error, undefined, `${student.email}: ${error && Object.keys(error.errors)}`);

    const profileError = new Profile({
      user: objectId,
      branch: student.branch,
      graduationYear: student.graduationYear,
      track: student.track,
      targetRole: student.targetRole,
      skills: student.skills,
      projects: student.projects,
    }).validateSync();
    assert.equal(profileError, undefined, `${student.email}: ${profileError && Object.keys(profileError.errors)}`);
  }

  for (const { graduationYear: _graduationYear, ...offer } of offers.slice(0, 10)) {
    const error = new Offer({ ...offer, student: objectId }).validateSync();
    assert.equal(error, undefined, `${offer.company}: ${error && Object.keys(error.errors)}`);
  }
});
