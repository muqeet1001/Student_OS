import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { buildAlumniStats } from '../src/services/alumniStats.js';

const id = () => new mongoose.Types.ObjectId();
const NOW = new Date('2026-06-01T00:00:00Z');
const LAKH = 100_000;

/** Builds a batch of `size` students graduating in `year`. */
function batch(year, size) {
  return Array.from({ length: size }, () => ({ user: id(), graduationYear: year, branch: 'CSE' }));
}

const offer = (student, overrides = {}) => ({
  student,
  company: 'Infosys',
  status: 'accepted',
  ctc: 6 * LAKH,
  ...overrides,
});

test('an empty history reports nothing rather than dividing by zero', () => {
  const result = buildAlumniStats({ profiles: [], offers: [], now: NOW });

  assert.deepEqual(result.years, []);
  assert.equal(result.trend, null);
  assert.equal(result.totals.batches, 0);
  assert.ok(result.trendNote, 'the page should be told why there is no trend');
});

test('a batch is sized from profiles, not from students who got offers', () => {
  // Counting only students with offers is how a placement rate quietly
  // becomes 100%.
  const students = batch(2024, 10);

  const result = buildAlumniStats({
    profiles: students,
    offers: [offer(students[0].user), offer(students[1].user)],
    now: NOW,
  });

  assert.equal(result.years[0].students, 10);
  assert.equal(result.years[0].placed, 2);
  assert.equal(result.years[0].placementRate, 20);
});

test('a student holding several offers is one placement in their batch', () => {
  const students = batch(2024, 4);

  const result = buildAlumniStats({
    profiles: students,
    offers: [
      offer(students[0].user, { company: 'Infosys' }),
      offer(students[0].user, { company: 'TCS' }),
      offer(students[0].user, { company: 'Zoho', status: 'joined' }),
    ],
    now: NOW,
  });

  assert.equal(result.years[0].offers, 3);
  assert.equal(result.years[0].placed, 1);
  assert.equal(result.years[0].placementRate, 25);
});

test('declined offers do not place an alumnus', () => {
  const students = batch(2024, 2);

  const result = buildAlumniStats({
    profiles: students,
    offers: [
      offer(students[0].user, { status: 'declined' }),
      offer(students[1].user, { status: 'withdrawn' }),
    ],
    now: NOW,
  });

  assert.equal(result.years[0].placed, 0);
});

test('batches are listed newest first', () => {
  const result = buildAlumniStats({
    profiles: [...batch(2022, 1), ...batch(2024, 1), ...batch(2023, 1)],
    offers: [],
    now: NOW,
  });

  assert.deepEqual(
    result.years.map((year) => year.graduationYear),
    [2024, 2023, 2022],
  );
});

test('a batch with no offers at all still appears, at zero', () => {
  // Dropping it would quietly remove the college's worst year from the page.
  const result = buildAlumniStats({ profiles: batch(2023, 30), offers: [], now: NOW });

  assert.equal(result.years.length, 1);
  assert.equal(result.years[0].students, 30);
  assert.equal(result.years[0].placementRate, 0);
});

/**
 * The honesty rule. A season that is still running always looks worse than a
 * finished one, and comparing them manufactures a "placements are down"
 * headline out of the calendar.
 */
test('a batch graduating this year or later is marked in progress', () => {
  const result = buildAlumniStats({
    profiles: [...batch(2024, 5), ...batch(2026, 5), ...batch(2027, 5)],
    offers: [],
    now: NOW,
  });

  const byYear = Object.fromEntries(result.years.map((year) => [year.graduationYear, year]));

  assert.equal(byYear[2024].inProgress, false);
  assert.equal(byYear[2026].inProgress, true, 'this year is still being placed');
  assert.equal(byYear[2027].inProgress, true);
});

test('the trend ignores in-progress batches', () => {
  const finished2023 = batch(2023, 10);
  const finished2024 = batch(2024, 10);
  const running2026 = batch(2026, 10);

  const result = buildAlumniStats({
    profiles: [...finished2023, ...finished2024, ...running2026],
    offers: [
      ...finished2023.slice(0, 5).map((student) => offer(student.user)),
      ...finished2024.slice(0, 8).map((student) => offer(student.user)),
      // The current batch has barely started; it must not drag the trend.
      offer(running2026[0].user),
    ],
    now: NOW,
  });

  assert.equal(result.trend.from, 2023);
  assert.equal(result.trend.to, 2024);
  assert.equal(result.trend.placementRateChange, 30, '50% to 80%');
  assert.equal(result.trend.batches, 2);
});

test('one completed batch produces no trend, and says why', () => {
  const result = buildAlumniStats({
    profiles: [...batch(2024, 5), ...batch(2026, 5)],
    offers: [],
    now: NOW,
  });

  assert.equal(result.trend, null);
  assert.match(result.trendNote, /needs two/);
});

test('only in-progress batches produce no trend, and say why', () => {
  const result = buildAlumniStats({ profiles: batch(2026, 5), offers: [], now: NOW });

  assert.equal(result.trend, null);
  assert.match(result.trendNote, /still running/);
});

test('a completed trend carries no note, since there is nothing to explain', () => {
  const result = buildAlumniStats({
    profiles: [...batch(2023, 2), ...batch(2024, 2)],
    offers: [],
    now: NOW,
  });

  assert.ok(result.trend);
  assert.equal(result.trendNote, null);
});

test('salary is reported per batch, with a median as well as a mean', () => {
  const students = batch(2024, 5);

  const result = buildAlumniStats({
    profiles: students,
    offers: [3, 4, 5, 6, 45].map((lpa, index) =>
      offer(students[index].user, { ctc: lpa * LAKH, company: `C${index}` }),
    ),
    now: NOW,
  });

  assert.equal(result.years[0].salary.median, 5 * LAKH, 'not dragged by the outlier');
  assert.equal(result.years[0].salary.highest, 45 * LAKH);
  assert.equal(result.years[0].salary.average, 12.6 * LAKH);
  assert.equal(result.years[0].salary.reported, 5);
});

test('offers with no package reported are left out of the salary figures', () => {
  const students = batch(2024, 2);

  const result = buildAlumniStats({
    profiles: students,
    offers: [
      offer(students[0].user, { ctc: 8 * LAKH }),
      offer(students[1].user, { ctc: null }),
    ],
    now: NOW,
  });

  assert.equal(result.years[0].salary.reported, 1);
  assert.equal(result.years[0].salary.average, 8 * LAKH, 'not halved by an unreported package');
  assert.equal(result.years[0].placed, 2, 'but both are placed');
});

test('top recruiters count distinct students hired, not offers made', () => {
  const students = batch(2024, 6);

  const result = buildAlumniStats({
    profiles: students,
    offers: [
      // Infosys made three offers but two went to the same student.
      offer(students[0].user, { company: 'Infosys' }),
      offer(students[0].user, { company: 'Infosys' }),
      offer(students[1].user, { company: 'Infosys' }),
      offer(students[2].user, { company: 'TCS' }),
      offer(students[3].user, { company: 'TCS' }),
      offer(students[4].user, { company: 'TCS' }),
    ],
    now: NOW,
  });

  const top = result.years[0].topRecruiters;

  assert.equal(top[0].company, 'TCS');
  assert.equal(top[0].hired, 3);
  assert.equal(top[1].company, 'Infosys');
  assert.equal(top[1].hired, 2, 'two students, not three offers');
});

test('a declined offer does not make a company a recruiter of that batch', () => {
  const students = batch(2024, 2);

  const result = buildAlumniStats({
    profiles: students,
    offers: [offer(students[0].user, { company: 'Ghosted Ltd', status: 'declined' })],
    now: NOW,
  });

  assert.deepEqual(result.years[0].topRecruiters, []);
});

test('only the top five recruiters are listed', () => {
  const students = batch(2024, 8);

  const result = buildAlumniStats({
    profiles: students,
    offers: students.map((student, index) =>
      offer(student.user, { company: `Company ${index}` }),
    ),
    now: NOW,
  });

  assert.equal(result.years[0].topRecruiters.length, 5);
});

/**
 * An offer that cannot be attributed to a batch must not be attributed to
 * the wrong one — that would corrupt the exact number this page exists for.
 */
test('an offer to a student with no graduation year is not counted anywhere', () => {
  const students = batch(2024, 3);
  const orphan = id();

  const result = buildAlumniStats({
    profiles: students,
    offers: [offer(students[0].user), offer(orphan, { ctc: 90 * LAKH })],
    now: NOW,
  });

  assert.equal(result.years.length, 1);
  assert.equal(result.years[0].offers, 1);
  assert.equal(result.years[0].salary.highest, 6 * LAKH, 'the orphan package must not leak in');
});

test('a populated student object is matched to the same person as a raw id', () => {
  const students = batch(2024, 2);

  const result = buildAlumniStats({
    profiles: students,
    offers: [
      offer({ _id: students[0].user, name: 'Asha' }),
      offer(students[0].user, { company: 'TCS' }),
    ],
    now: NOW,
  });

  assert.equal(result.years[0].placed, 1, 'populate() must not split one student into two');
});

test('a profile with no graduation year forms no batch', () => {
  const result = buildAlumniStats({
    profiles: [{ user: id(), graduationYear: null }, { user: id() }],
    offers: [],
    now: NOW,
  });

  assert.deepEqual(result.years, []);
});

test('totals count placed alumni from completed batches only', () => {
  const done = batch(2024, 4);
  const running = batch(2026, 4);

  const result = buildAlumniStats({
    profiles: [...done, ...running],
    offers: [
      offer(done[0].user),
      offer(done[1].user),
      offer(running[0].user),
    ],
    now: NOW,
  });

  assert.equal(result.totals.batches, 2);
  assert.equal(result.totals.completedBatches, 1);
  assert.equal(result.totals.alumniPlaced, 2, 'the in-progress batch is not history yet');
});
