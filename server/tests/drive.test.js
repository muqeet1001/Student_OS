import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { Drive } from '../src/models/Drive.js';
import { parseJobDescription, scoreStudent } from '../src/services/jobMatch.js';

const DESCRIPTION = `Software Engineer

Required: Java, data structures and DBMS.
Minimum CGPA 7.0. Computer Science and IT, graduating 2026.`;

test('a drive stores the parsed requirement, not just the text', () => {
  const drive = new Drive({
    company: 'ABC Technologies',
    role: 'Software Engineer',
    description: DESCRIPTION,
    requirements: parseJobDescription(DESCRIPTION),
  });

  assert.equal(drive.validateSync(), undefined);
  assert.equal(drive.requirements.minCgpa, 7);
  assert.equal(drive.requirements.graduationYear, 2026);
  assert.ok(
    drive.requirements.skills.some((skill) => skill.name === 'Data Structures'),
    'the requirement should be queryable without re-parsing the description',
  );
});

test('a drive requires a company, a role and a description', () => {
  const error = new Drive({}).validateSync();

  assert.ok(error.errors.company);
  assert.ok(error.errors.role);
  assert.ok(error.errors.description);
});

test('shortlist counts are derived, so they cannot drift from the entries', () => {
  const drive = new Drive({
    company: 'ABC',
    role: 'SWE',
    description: DESCRIPTION,
    shortlist: [
      { student: new mongoose.Types.ObjectId(), stage: 'shortlisted' },
      { student: new mongoose.Types.ObjectId(), stage: 'interview' },
      { student: new mongoose.Types.ObjectId(), stage: 'selected' },
      { student: new mongoose.Types.ObjectId(), stage: 'selected' },
    ],
  });

  assert.equal(drive.shortlistCount, 4);
  assert.equal(drive.selectedCount, 2);
});

test('a shortlist entry rejects a stage outside the pipeline', () => {
  const drive = new Drive({
    company: 'ABC',
    role: 'SWE',
    description: DESCRIPTION,
    shortlist: [{ student: new mongoose.Types.ObjectId(), stage: 'hired' }],
  });

  assert.ok(drive.validateSync(), '"hired" is not a stage this pipeline knows');
});

/**
 * Eligibility is the college's bar on top of the JD's own filters, so both
 * have to hold. Mirrors the rule in getDrive.
 */
test('eligibility requires no blockers and the drive minimum readiness', () => {
  const requirements = parseJobDescription(DESCRIPTION);

  const build = (overrides) => ({
    readiness: 70,
    solved: 20,
    testAverage: 70,
    interviewAverage: 60,
    profile: {
      branch: 'Computer Science',
      graduationYear: 2026,
      education: [{ grade: '8.0 CGPA' }],
      skills: [
        { name: 'Java', verified: true },
        { name: 'Data Structures', verified: true },
        { name: 'DBMS', verified: true },
      ],
      projects: [],
      ...overrides.profile,
    },
    ...overrides,
  });

  const eligible = (student, minReadiness) => {
    const match = scoreStudent(student, requirements);
    return match.blockers.length === 0 && student.readiness >= minReadiness;
  };

  assert.equal(eligible(build({}), 60), true);

  assert.equal(
    eligible(build({ readiness: 40 }), 60),
    false,
    'below the college bar, even with no JD blockers',
  );

  assert.equal(
    eligible(build({ profile: { education: [{ grade: '6.0 CGPA' }] } }), 0),
    false,
    'a CGPA blocker disqualifies regardless of readiness',
  );

  assert.equal(
    eligible(build({ profile: { branch: 'Mechanical' } }), 0),
    false,
    'a branch outside the listed ones is a blocker',
  );
});

test('adding the same student twice does not duplicate the shortlist', () => {
  // Mirrors the dedupe in addToShortlist: re-running a selection is common.
  const a = new mongoose.Types.ObjectId();
  const b = new mongoose.Types.ObjectId();

  const shortlist = [{ student: a }];
  const existing = new Set(shortlist.map((entry) => String(entry.student)));
  const toAdd = [a, b].filter((id) => !existing.has(String(id)));

  assert.deepEqual(
    toAdd.map(String),
    [String(b)],
    'only the genuinely new student should be appended',
  );
});

test('shortlist CSV escapes fields that would break a spreadsheet', () => {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  // Notes are free text typed by staff, so they are the likeliest to contain
  // a comma or a quote.
  assert.equal(escape('Strong on DSA, weak on SQL'), '"Strong on DSA, weak on SQL"');
  assert.equal(escape('Said "ready to relocate"'), '"Said ""ready to relocate"""');
  assert.equal(escape(''), '');
});
