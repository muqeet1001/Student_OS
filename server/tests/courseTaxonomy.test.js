import assert from 'node:assert/strict';
import test from 'node:test';

import { tests } from '../src/seed/data/tests.js';
import {
  DOMAINS,
  LEVELS,
  LEVEL_ORDER,
  STAGES,
  SUBJECTS,
  focusLevelFor,
  focusReferenceSemester,
  levelForSemester,
  stageFocus,
  stageForSemester,
  subjectById,
  subjectSlugs,
  suggestSemester,
  testCourse,
} from '../src/config/courseTaxonomy.js';

const domainIds = new Set(DOMAINS.map((domain) => domain.id));
const levelIds = new Set(Object.keys(LEVELS));

test('every subject is unique, well-formed and sits in exactly one domain', () => {
  const seen = new Set();

  for (const subject of SUBJECTS) {
    assert.equal(seen.has(subject.id), false, `duplicate subject id: ${subject.id}`);
    seen.add(subject.id);
    assert.ok(domainIds.has(subject.domain), `${subject.id} has unknown domain ${subject.domain}`);
    assert.ok(levelIds.has(subject.defaultLevel), `${subject.id} has unknown level ${subject.defaultLevel}`);
  }
});

test('Aptitude subjects can never be CS-core subjects — Databases is a CS-core subject', () => {
  const byDomain = (id) => SUBJECTS.filter((subject) => subject.domain === id).map((subject) => subject.id);

  const aptitude = byDomain('aptitude');
  const csCore = byDomain('cs-core');
  const overlap = aptitude.filter((id) => csCore.includes(id));

  assert.deepEqual(overlap, [], `subject shared between Aptitude and CS Core: ${overlap.join(', ')}`);
  assert.ok(aptitude.includes('quantitative'), 'Aptitude should contain Quantitative Aptitude');
  assert.ok(csCore.includes('databases'), 'Databases must be a CS Core subject, not Aptitude');
  assert.ok(!aptitude.includes('databases'), 'Databases must not be an Aptitude subject');
});

test('every seeded test paper maps to a subject and stays in its real domain', () => {
  const categoryToDomain = { aptitude: 'aptitude', technical: 'cs-core', communication: 'communication' };

  for (const paper of tests) {
    const course = testCourse(paper.slug);
    assert.ok(course, `no taxonomy entry for seeded paper "${paper.slug}"`);
    assert.ok(subjectById(course.subjectId), `unknown subject ${course.subjectId} for ${paper.slug}`);
    assert.ok(levelIds.has(course.level), `unknown level ${course.level} for ${paper.slug}`);

    // The mapping must not contradict the paper's own category: aptitude
    // papers stay aptitude, and nothing database-flavoured lands under it.
    const expectedDomain = categoryToDomain[paper.category];
    assert.equal(course.domain, expectedDomain, `${paper.slug} (${paper.category}) mapped to ${course.domain}`);
  }

  // The reported failure mode, pinned down: the DBMS paper is a CS-core paper.
  assert.equal(testCourse('dbms-fundamentals').domain, 'cs-core');
  assert.equal(testCourse('dbms-fundamentals').subjectId, 'databases');
  assert.equal(testCourse('aptitude-sprint').domain, 'aptitude');
});

test('subject slug lookups are exact', () => {
  assert.deepEqual(subjectSlugs('databases'), ['dbms-fundamentals']);
  assert.deepEqual(subjectSlugs('quantitative').sort(), ['aptitude-sprint', 'quantitative-aptitude-2']);
  assert.deepEqual(subjectSlugs('networks'), ['computer-networks']);
  assert.deepEqual(subjectSlugs('does-not-exist'), []);
});

test('stages cover semesters 1-8 exactly once with valid focus subjects', () => {
  const covered = [];

  for (const stage of STAGES) {
    assert.equal(stage.semesters.length, 2, `${stage.id} must span two semesters`);
    covered.push(stage.semesters[0], stage.semesters[1]);
    assert.equal(stage.semesters[1], stage.semesters[0] + 1, `${stage.id} must be contiguous`);

    for (const entry of stage.focus) {
      assert.ok(subjectById(entry.subjectId), `${stage.id} references unknown subject ${entry.subjectId}`);
      // `level` is optional on a focus entry: leaving it out means "whatever
      // this stage's semester band derives". An override still has to name a
      // level that exists.
      assert.ok(
        entry.level === undefined || levelIds.has(entry.level),
        `${stage.id} references unknown level ${entry.level}`,
      );
    }
  }

  assert.deepEqual([...covered].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(STAGES.map((stage) => stage.label)).size, STAGES.length, 'stage labels must be unique');
});

test('stage boundaries resolve each semester to the right stage', () => {
  const expect = {
    1: 'foundations', 2: 'foundations',
    3: 'core-building', 4: 'core-building',
    5: 'interview-gear', 6: 'interview-gear',
    7: 'placement-mode', 8: 'placement-mode',
  };

  for (const [semester, stageId] of Object.entries(expect)) {
    assert.equal(stageForSemester(Number(semester)).id, stageId, `semester ${semester}`);
  }

  assert.equal(stageForSemester(0), null);
  assert.equal(stageForSemester(9), null);
  assert.equal(stageForSemester(null), null);
  assert.equal(stageForSemester(undefined), null);
});

test('stage focus resolves subject and level labels', () => {
  const focus = stageFocus(stageForSemester(3));

  assert.ok(focus.length > 0);
  for (const entry of focus) {
    assert.ok(entry.subjectLabel.length > 0);
    assert.ok(entry.levelLabel.length > 0);
  }

  const quantitative = focus.find((entry) => entry.subjectId === 'quantitative');
  assert.equal(quantitative.domain, 'aptitude');
  assert.equal(quantitative.level, 'intermediate');
  assert.equal(quantitative.levelLabel, 'Intermediate');
});

test('suggestSemester derives the semester from the graduation year', () => {
  // Class of 2027 admitted Aug 2023: Sep 2026 is their 7th semester.
  assert.equal(suggestSemester(2027, new Date('2026-09-08T00:00:00Z')), 7);
  // Jan 2027 is the second half of the same academic year: semester 8.
  assert.equal(suggestSemester(2027, new Date('2027-01-10T00:00:00Z')), 8);
  // Class of 2028 admitted Aug 2024: Sep 2026 is semester 5.
  assert.equal(suggestSemester(2028, new Date('2026-09-08T00:00:00Z')), 5);
  // Class of 2030 starts Aug 2026: Sep 2026 is semester 1.
  assert.equal(suggestSemester(2030, new Date('2026-09-08T00:00:00Z')), 1);
  // A 2026 graduate still listed in Sep 2026 clamps to semester 8.
  assert.equal(suggestSemester(2026, new Date('2026-09-08T00:00:00Z')), 8);
  // May 2026 for the class of 2026 is the final semester.
  assert.equal(suggestSemester(2026, new Date('2026-05-01T00:00:00Z')), 8);
  // Implausible years yield no suggestion rather than a wrong one.
  assert.equal(suggestSemester(1900, new Date('2026-09-08T00:00:00Z')), null);
  assert.equal(suggestSemester(null, new Date('2026-09-08T00:00:00Z')), null);
});

test('testCourse returns null for unknown slugs', () => {
  assert.equal(testCourse('not-a-real-paper'), null);
});

test('a semester resolves to the highest level band that covers it', () => {
  /*
   * The bands overlap at 3 and again across 5-6, deliberately. The higher band
   * wins, because that is the level the student is moving into rather than the
   * one they are leaving.
   */
  assert.equal(levelForSemester(1), 'foundation');
  assert.equal(levelForSemester(2), 'foundation');
  assert.equal(levelForSemester(3), 'intermediate');
  assert.equal(levelForSemester(4), 'intermediate');
  assert.equal(levelForSemester(5), 'advanced');
  assert.equal(levelForSemester(6), 'advanced');
  assert.equal(levelForSemester(7), 'advanced');
  assert.equal(levelForSemester(8), 'advanced');

  // Outside the eight semesters there is no answer, rather than a wrong one
  // dressed up as a default.
  for (const impossible of [0, 9, -1, 3.5, NaN, '3', null, undefined, {}]) {
    assert.equal(levelForSemester(impossible), null, `${String(impossible)} should have no level`);
  }
});

test('the level bands cover all eight semesters, in order, within range', () => {
  for (const id of LEVEL_ORDER) {
    const band = LEVELS[id].semesterBand;
    assert.equal(band.length, 2, `${id} band must have two ends`);
    assert.ok(band[0] <= band[1], `${id} band is inverted`);
    assert.ok(band[0] >= 1 && band[1] <= 8, `${id} band escapes the eight semesters`);
  }

  // LEVEL_ORDER is the progression itself. A level missing from it would be
  // unrankable the moment an override is measured against the derived level.
  assert.deepEqual([...LEVEL_ORDER].sort(), Object.keys(LEVELS).sort());

  for (let semester = 1; semester <= 8; semester += 1) {
    assert.ok(levelForSemester(semester), `semester ${semester} is covered by no band`);
  }
});

test('the resolved focus levels are exactly the ones the app recommends', () => {
  /*
   * The behaviour pin. Deriving these levels instead of writing them down is
   * only safe while the result is identical, so the shipped table is asserted
   * in full: drift in a band, a stage or an override fails here rather than
   * quietly repointing what students are told to study.
   */
  const expected = {
    foundations: {
      quantitative: 'foundation',
      logical: 'foundation',
      verbal: 'foundation',
      'cs-foundations': 'foundation',
      dsa: 'foundation',
      communication: 'foundation',
    },
    'core-building': {
      quantitative: 'intermediate',
      logical: 'intermediate',
      dsa: 'intermediate',
      'data-interpretation': 'intermediate',
      oop: 'intermediate',
      // The one subject that trails its cohort at this stage.
      databases: 'foundation',
      communication: 'intermediate',
    },
    'interview-gear': {
      dsa: 'advanced',
      databases: 'intermediate',
      os: 'intermediate',
      networks: 'intermediate',
      quantitative: 'advanced',
      'data-interpretation': 'advanced',
      communication: 'advanced',
    },
    'placement-mode': {
      dsa: 'advanced',
      databases: 'advanced',
      os: 'advanced',
      networks: 'advanced',
      quantitative: 'advanced',
      'data-interpretation': 'advanced',
      verbal: 'intermediate',
      communication: 'advanced',
    },
  };

  assert.deepEqual(Object.keys(expected).sort(), STAGES.map((stage) => stage.id).sort());

  for (const stage of STAGES) {
    const resolved = Object.fromEntries(
      stageFocus(stage).map((entry) => [entry.subjectId, entry.level]),
    );
    assert.deepEqual(resolved, expected[stage.id], `${stage.id} recommendations changed`);
  }
});

test('the semester band does the work — focus levels are derived, not hand-written', () => {
  const entries = STAGES.flatMap((stage) => stage.focus);
  const overrides = entries.filter((entry) => entry.level);

  // If someone re-hardcodes every level, the derivation stops mattering and
  // this file quietly goes back to being two tables that can drift apart.
  assert.ok(overrides.length > 0, 'the override path should be exercised, not just declared');
  assert.ok(
    overrides.length * 2 < entries.length,
    `${overrides.length} of ${entries.length} focus levels are hand-written; the band is meant to be the default`,
  );
});

test('an override never drops more than one tier below the stage aim', () => {
  const rank = (id) => LEVEL_ORDER.indexOf(id);

  for (const stage of STAGES) {
    const derived = levelForSemester(focusReferenceSemester(stage));
    assert.ok(derived, `${stage.id} has no derivable level`);

    for (const entry of stage.focus) {
      const resolved = focusLevelFor(stage, entry);
      assert.ok(LEVEL_ORDER.includes(resolved), `${stage.id}/${entry.subjectId} → ${resolved}`);

      if (entry.level === undefined) {
        assert.equal(
          resolved,
          derived,
          `${stage.id}/${entry.subjectId} should track the semester band`,
        );
        continue;
      }

      const below = rank(derived) - rank(resolved);
      assert.ok(below >= 0, `${stage.id}/${entry.subjectId} overrides above the stage aim`);
      assert.ok(
        below <= 1,
        `${stage.id}/${entry.subjectId} sits ${below} tiers below ${derived} — a whole level out of step`,
      );
    }
  }
});

test('a missing stage or entry yields no level instead of throwing', () => {
  assert.deepEqual(stageFocus(null), []);
  assert.deepEqual(stageFocus(undefined), []);
  assert.equal(focusReferenceSemester(null), null);
  assert.equal(focusLevelFor({ semesters: [1, 2] }, { subjectId: 'dsa' }), 'foundation');
});
