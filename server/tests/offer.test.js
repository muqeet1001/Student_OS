import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { Offer } from '../src/models/Offer.js';
import { buildPlacementReport } from '../src/services/placementReport.js';
import { createOfferSchema, updateOfferSchema } from '../src/validators/offer.validators.js';

const id = () => new mongoose.Types.ObjectId();

const LAKH = 100_000;

/** Builds the shape the controller hands the report service. */
function cohort(students, offers) {
  return {
    totalStudents: students.length,
    profiles: students.map((student) => ({ user: student.user, branch: student.branch })),
    offers,
  };
}

test('an offer requires a student, a company and a role', () => {
  const error = new Offer({}).validateSync();

  assert.ok(error.errors.student);
  assert.ok(error.errors.company);
  assert.ok(error.errors.role);
});

test('an offer defaults to "offered" and rejects a status outside the lifecycle', () => {
  const base = { student: id(), company: 'ABC', role: 'SWE' };

  assert.equal(new Offer(base).status, 'offered');
  assert.ok(
    new Offer({ ...base, status: 'hired' }).validateSync(),
    '"hired" is not a status this lifecycle knows',
  );
});

/**
 * The rule the whole report rests on. A placement percentage above 100 is
 * always this bug.
 */
test('a student holding three offers counts as one placement', () => {
  const student = id();
  const other = id();

  const report = buildPlacementReport(
    cohort(
      [
        { user: student, branch: 'Computer Science' },
        { user: other, branch: 'Computer Science' },
      ],
      [
        { student, company: 'Google', role: 'SWE', status: 'accepted' },
        { student, company: 'Amazon', role: 'SDE', status: 'accepted' },
        { student, company: 'Zoho', role: 'MTS', status: 'joined' },
      ],
    ),
  );

  assert.equal(report.totals.offers, 3);
  assert.equal(report.totals.placed, 1, 'three offers to one student is one placement');
  assert.equal(report.totals.placementRate, 50, '1 of 2 students, not 150%');
  assert.equal(report.totals.offersPerPlacedStudent, 3);
});

test('declined and withdrawn offers do not place a student', () => {
  const declined = id();
  const withdrawn = id();
  const pending = id();
  const joined = id();

  const report = buildPlacementReport(
    cohort(
      [declined, withdrawn, pending, joined].map((user) => ({ user, branch: 'IT' })),
      [
        { student: declined, company: 'A', role: 'SWE', status: 'declined' },
        { student: withdrawn, company: 'B', role: 'SWE', status: 'withdrawn' },
        // "offered" is not yet a placement either — the student has not said yes.
        { student: pending, company: 'C', role: 'SWE', status: 'offered' },
        { student: joined, company: 'D', role: 'SWE', status: 'joined' },
      ],
    ),
  );

  assert.equal(report.totals.placed, 1);
  assert.equal(report.totals.placementRate, 25);
});

test('the student is counted once whether populated or a raw id', () => {
  // listOffers populates `student`; the report must not treat the two shapes
  // as different people.
  const student = id();

  const report = buildPlacementReport(
    cohort(
      [{ user: student, branch: 'CSE' }],
      [
        { student: { _id: student, name: 'Asha' }, company: 'A', role: 'SWE', status: 'accepted' },
        { student, company: 'B', role: 'SWE', status: 'joined' },
      ],
    ),
  );

  assert.equal(report.totals.placed, 1);
});

/**
 * One outlier package distorts a mean badly in a cohort this size, which is
 * exactly how a brochure ends up quoting an average nobody achieved.
 */
test('the median resists an outlier package that drags the average up', () => {
  const offers = [3, 3.5, 4, 4.5, 45].map((lpa, index) => ({
    student: id(),
    company: `C${index}`,
    role: 'SWE',
    status: 'accepted',
    ctc: lpa * LAKH,
  }));

  const { salary } = buildPlacementReport(
    cohort(
      offers.map((offer) => ({ user: offer.student, branch: 'CSE' })),
      offers,
    ),
  );

  assert.equal(salary.median, 4 * LAKH, 'the middle package, not the outlier-inflated mean');
  assert.equal(salary.average, 12 * LAKH);
  assert.equal(salary.highest, 45 * LAKH);
  assert.equal(salary.lowest, 3 * LAKH);
  assert.equal(salary.reported, 5);
});

test('an even number of packages averages the middle two', () => {
  const offers = [4, 6, 8, 12].map((lpa) => ({
    student: id(),
    company: 'C',
    role: 'SWE',
    status: 'accepted',
    ctc: lpa * LAKH,
  }));

  const { salary } = buildPlacementReport(
    cohort(
      offers.map((offer) => ({ user: offer.student, branch: 'CSE' })),
      offers,
    ),
  );

  assert.equal(salary.median, 7 * LAKH);
});

test('offers with no package reported are left out of the salary figures', () => {
  const withCtc = { student: id(), company: 'A', role: 'SWE', status: 'accepted', ctc: 6 * LAKH };
  const withoutCtc = { student: id(), company: 'B', role: 'SWE', status: 'accepted', ctc: null };

  const { salary, totals } = buildPlacementReport(
    cohort(
      [withCtc, withoutCtc].map((offer) => ({ user: offer.student, branch: 'CSE' })),
      [withCtc, withoutCtc],
    ),
  );

  assert.equal(salary.reported, 1, 'an unreported package is not a zero-rupee package');
  assert.equal(salary.average, 6 * LAKH);
  assert.equal(totals.placed, 2, 'but both students are still placed');
});

test('an empty cohort reports zeroes rather than dividing by zero', () => {
  const report = buildPlacementReport(cohort([], []));

  assert.equal(report.totals.placementRate, 0);
  assert.equal(report.totals.offersPerPlacedStudent, 0);
  assert.equal(report.salary.median, 0);
  assert.equal(report.salary.average, 0);
  assert.deepEqual(report.companies, []);
});

test('department rates are placed-over-strength, counting students without offers', () => {
  const cse = [id(), id(), id(), id()];
  const mech = [id(), id()];

  const report = buildPlacementReport(
    cohort(
      [
        ...cse.map((user) => ({ user, branch: 'Computer Science' })),
        ...mech.map((user) => ({ user, branch: 'Mechanical' })),
      ],
      [
        { student: cse[0], company: 'A', role: 'SWE', status: 'accepted' },
        { student: cse[1], company: 'A', role: 'SWE', status: 'joined' },
        { student: cse[2], company: 'A', role: 'SWE', status: 'declined' },
        { student: mech[0], company: 'B', role: 'GET', status: 'accepted' },
      ],
    ),
  );

  const byName = Object.fromEntries(report.branches.map((entry) => [entry.branch, entry]));

  assert.equal(byName['Computer Science'].students, 4, 'the whole department, not just applicants');
  assert.equal(byName['Computer Science'].placed, 2);
  assert.equal(byName['Computer Science'].rate, 50);
  assert.equal(byName.Mechanical.rate, 50);
  assert.equal(report.branches[0].rate >= report.branches.at(-1).rate, true, 'sorted by rate');
});

test('a student with no branch on file lands in Unspecified rather than vanishing', () => {
  const student = id();

  const report = buildPlacementReport(
    cohort([{ user: student, branch: '' }], [
      { student, company: 'A', role: 'SWE', status: 'accepted' },
    ]),
  );

  assert.equal(report.branches[0].branch, 'Unspecified');
  assert.equal(report.branches[0].placed, 1);
});

test('company rows separate offers made from students placed', () => {
  const students = [id(), id(), id()];

  const report = buildPlacementReport(
    cohort(
      students.map((user) => ({ user, branch: 'CSE' })),
      [
        { student: students[0], company: 'Infosys', role: 'SE', status: 'accepted' },
        { student: students[1], company: 'Infosys', role: 'SE', status: 'declined' },
        { student: students[2], company: 'Infosys', role: 'SE', status: 'offered' },
        { student: students[0], company: 'TCS', role: 'SE', status: 'joined' },
      ],
    ),
  );

  const infosys = report.companies.find((entry) => entry.company === 'Infosys');

  assert.equal(infosys.offers, 3);
  assert.equal(infosys.placed, 1, 'a declined offer is not a conversion');
});

test('status counts cover every state, including the ones with no offers', () => {
  const student = id();

  const report = buildPlacementReport(
    cohort([{ user: student, branch: 'CSE' }], [
      { student, company: 'A', role: 'SWE', status: 'accepted' },
    ]),
  );

  assert.equal(report.statuses.length, 5);
  assert.equal(report.statuses.find((entry) => entry.status === 'accepted').count, 1);
  assert.equal(
    report.statuses.find((entry) => entry.status === 'declined').count,
    0,
    'an absent status still reports zero so the chart keeps its shape',
  );
});

test('the create validator coerces a typed CTC and defaults the status', () => {
  const parsed = createOfferSchema.parse({
    student: id().toString(),
    company: '  Infosys  ',
    role: 'Systems Engineer',
    // Arrives as a string from the number input.
    ctc: '800000',
  });

  assert.equal(parsed.ctc, 800_000);
  assert.equal(parsed.company, 'Infosys', 'trimmed, so "Infosys " is not a second company');
  assert.equal(parsed.status, 'offered');
});

test('the create validator rejects a bad student id and a negative package', () => {
  const base = { student: id().toString(), company: 'A', role: 'SWE' };

  assert.equal(createOfferSchema.safeParse({ ...base, student: 'not-an-id' }).success, false);
  assert.equal(createOfferSchema.safeParse({ ...base, ctc: -1 }).success, false);
  assert.equal(createOfferSchema.safeParse({ ...base, company: '' }).success, false);
});

test('the update validator cannot move an offer to a different student', () => {
  const parsed = updateOfferSchema.parse({ status: 'accepted', student: id().toString() });

  assert.equal(parsed.status, 'accepted');
  assert.equal(
    parsed.student,
    undefined,
    'reassigning an offer would silently rewrite placement history',
  );
});

test('the update validator accepts a status-only change', () => {
  // The status dropdown in the offers list sends exactly this.
  assert.equal(updateOfferSchema.safeParse({ status: 'joined' }).success, true);
  assert.equal(updateOfferSchema.safeParse({ status: 'ghosted' }).success, false);
});
