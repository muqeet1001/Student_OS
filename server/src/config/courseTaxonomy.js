/**
 * Course taxonomy — the single source of truth for how practice content is
 * organised and for how a student's current semester shapes what they should
 * work on.
 *
 * Why this exists
 * ---------------
 * The old three-bucket split (aptitude / technical / communication) grouped
 * by *question style*, so a paper that verifies "Data Structures, DBMS and
 * Operating Systems" sat indistinguishably next to a Databases paper, and a
 * student browsing "Aptitude" could not tell aptitude from core-CS material.
 * These tables replace that with mutually exclusive *subjects* under three
 * domains. Nothing in the Aptitude domain can ever contain database or
 * systems content, because the mapping below is the only place a paper gets
 * its subject and it is one-to-one.
 *
 * Semesters are the progressive axis: an early-semester student is pointed at
 * foundations, a final-year student at placement-mode work. The stage tables
 * map semester 1-8 onto focus subjects and levels. Semester *recommends*, it
 * never locks — the full catalogue stays reachable through filters.
 */

export const DOMAINS = Object.freeze([
  { id: 'aptitude', label: 'Aptitude' },
  { id: 'cs-core', label: 'CS Core' },
  { id: 'communication', label: 'Communication' },
]);

export const LEVELS = Object.freeze({
  foundation: {
    label: 'Foundation',
    // Semester range the level is normally aimed at (inclusive).
    semesterBand: [1, 3],
    // Which coding-problem difficulties a student at this level should attempt.
    problemDifficulties: ['easy'],
  },
  intermediate: {
    label: 'Intermediate',
    semesterBand: [3, 6],
    problemDifficulties: ['easy', 'medium'],
  },
  advanced: {
    label: 'Advanced',
    semesterBand: [5, 8],
    problemDifficulties: ['medium', 'hard'],
  },
});

/**
 * One entry per subject. A subject belongs to exactly one domain, so filtering
 * by subject can never leak across the aptitude / CS-core boundary.
 */
export const SUBJECTS = Object.freeze([
  { id: 'quantitative', domain: 'aptitude', label: 'Quantitative Aptitude', defaultLevel: 'foundation' },
  { id: 'logical', domain: 'aptitude', label: 'Logical Reasoning', defaultLevel: 'foundation' },
  { id: 'data-interpretation', domain: 'aptitude', label: 'Data Interpretation', defaultLevel: 'intermediate' },

  { id: 'dsa', domain: 'cs-core', label: 'Data Structures & Algorithms', defaultLevel: 'intermediate' },
  // Databases (DBMS & SQL) is its own subject precisely so it can never sit under Aptitude.
  { id: 'databases', domain: 'cs-core', label: 'Databases — DBMS & SQL', defaultLevel: 'intermediate' },
  { id: 'os', domain: 'cs-core', label: 'Operating Systems', defaultLevel: 'advanced' },
  { id: 'networks', domain: 'cs-core', label: 'Computer Networks', defaultLevel: 'advanced' },
  { id: 'oop', domain: 'cs-core', label: 'OOP & Design', defaultLevel: 'foundation' },
  // The original warm-up sampler paper spans DSA/DBMS/OS/networking at
  // foundation level. It is kept but honestly labelled instead of vanishing
  // into whichever bucket the student happened to open.
  { id: 'cs-foundations', domain: 'cs-core', label: 'CS Core Foundations', defaultLevel: 'foundation' },

  { id: 'verbal', domain: 'communication', label: 'Verbal Ability', defaultLevel: 'foundation' },
  { id: 'communication', domain: 'communication', label: 'Communication & GD', defaultLevel: 'intermediate' },
]);

/**
 * Which subject (and level) each seeded test paper belongs to, keyed by slug.
 * Papers are mapped here rather than on the model so an existing database is
 * classified without a data migration, and so the map can be unit-tested
 * against the seed catalogue.
 */
export const TEST_COURSES = Object.freeze({
  'aptitude-sprint': { subjectId: 'quantitative', level: 'foundation' },
  'quantitative-aptitude-2': { subjectId: 'quantitative', level: 'intermediate' },
  'logical-reasoning': { subjectId: 'logical', level: 'foundation' },
  'data-interpretation': { subjectId: 'data-interpretation', level: 'intermediate' },
  'verbal-ability': { subjectId: 'verbal', level: 'foundation' },
  'communication-round': { subjectId: 'communication', level: 'intermediate' },
  'data-structures-mcq': { subjectId: 'dsa', level: 'intermediate' },
  'dbms-fundamentals': { subjectId: 'databases', level: 'intermediate' },
  'oop-concepts': { subjectId: 'oop', level: 'foundation' },
  'operating-systems': { subjectId: 'os', level: 'advanced' },
  'computer-networks': { subjectId: 'networks', level: 'advanced' },
  'technical-fundamentals': { subjectId: 'cs-foundations', level: 'foundation' },
});

/**
 * Four progressive stages over the eight semesters. `focus` lists the
 * subjects to work on at that stage, each with the level to aim at; order is
 * priority order for the practice-hub track panel.
 */
export const STAGES = Object.freeze([
  {
    id: 'foundations',
    label: 'Foundations',
    semesters: [1, 2],
    description:
      'Build the base every campus test assumes: core arithmetic and reasoning, clear written English, and first programming habits.',
    focus: Object.freeze([
      { subjectId: 'quantitative', level: 'foundation' },
      { subjectId: 'logical', level: 'foundation' },
      { subjectId: 'verbal', level: 'foundation' },
      { subjectId: 'cs-foundations', level: 'foundation' },
      { subjectId: 'dsa', level: 'foundation' },
      { subjectId: 'communication', level: 'foundation' },
    ]),
  },
  {
    id: 'core-building',
    label: 'Core building',
    semesters: [3, 4],
    description:
      'Solidify quantitative and logical fluency, learn to think in data structures, and pick up the CS subjects your branch is teaching now.',
    focus: Object.freeze([
      { subjectId: 'quantitative', level: 'intermediate' },
      { subjectId: 'logical', level: 'intermediate' },
      { subjectId: 'dsa', level: 'intermediate' },
      { subjectId: 'data-interpretation', level: 'intermediate' },
      { subjectId: 'oop', level: 'intermediate' },
      { subjectId: 'databases', level: 'foundation' },
      { subjectId: 'communication', level: 'intermediate' },
    ]),
  },
  {
    id: 'interview-gear',
    label: 'Interview gear',
    semesters: [5, 6],
    description:
      'Turn knowledge into interview answers: master databases, OS and networks, push DSA further, and start timed mock interviews.',
    focus: Object.freeze([
      { subjectId: 'dsa', level: 'advanced' },
      { subjectId: 'databases', level: 'intermediate' },
      { subjectId: 'os', level: 'intermediate' },
      { subjectId: 'networks', level: 'intermediate' },
      { subjectId: 'quantitative', level: 'advanced' },
      { subjectId: 'data-interpretation', level: 'advanced' },
      { subjectId: 'communication', level: 'advanced' },
    ]),
  },
  {
    id: 'placement-mode',
    label: 'Placement mode',
    semesters: [7, 8],
    description:
      'Everything is aimed at the real process now: previous-year questions, company rounds, timed mocks and your applications.',
    focus: Object.freeze([
      { subjectId: 'dsa', level: 'advanced' },
      { subjectId: 'databases', level: 'advanced' },
      { subjectId: 'os', level: 'advanced' },
      { subjectId: 'networks', level: 'advanced' },
      { subjectId: 'quantitative', level: 'advanced' },
      { subjectId: 'data-interpretation', level: 'advanced' },
      { subjectId: 'verbal', level: 'intermediate' },
      { subjectId: 'communication', level: 'advanced' },
    ]),
  },
]);

const SUBJECT_BY_ID = new Map(SUBJECTS.map((subject) => [subject.id, subject]));
const DOMAIN_BY_ID = new Map(DOMAINS.map((domain) => [domain.id, domain]));

/** The subject a test paper belongs to (undefined for unknown/legacy slugs). */
export function testCourse(slug) {
  const course = TEST_COURSES[slug];
  if (!course) return null;
  const subject = SUBJECT_BY_ID.get(course.subjectId);
  return {
    ...course,
    subjectLabel: subject?.label ?? course.subjectId,
    domain: subject?.domain ?? null,
  };
}

export function subjectById(id) {
  return SUBJECT_BY_ID.get(id);
}

export function domainById(id) {
  return DOMAIN_BY_ID.get(id);
}

/** Slugs of every published test mapped to a subject — used for DB lookups. */
export function subjectSlugs(subjectId) {
  return Object.entries(TEST_COURSES)
    .filter(([, course]) => course.subjectId === subjectId)
    .map(([slug]) => slug);
}

export function stageForSemester(semester) {
  if (!semester || semester < 1 || semester > 8) return null;
  return STAGES.find((stage) => semester >= stage.semesters[0] && semester <= stage.semesters[1]) ?? null;
}

/**
 * Enrich a stage's focus list with subject/domain/level labels, ready to
 * render or serialise.
 */
export function stageFocus(stage) {
  if (!stage) return [];
  return stage.focus.map((entry) => {
    const subject = SUBJECT_BY_ID.get(entry.subjectId);
    const level = LEVELS[entry.level];
    return {
      subjectId: entry.subjectId,
      subjectLabel: subject?.label ?? entry.subjectId,
      domain: subject?.domain ?? null,
      domainLabel: subject ? DOMAIN_BY_ID.get(subject.domain)?.label ?? null : null,
      level: entry.level,
      levelLabel: level?.label ?? entry.level,
    };
  });
}

/**
 * Best-guess current semester for a four-year programme from the graduation
 * year (admission is August of graduationYear - 4; Aug-Dec is the odd
 * semester, Jan-May the even one). Returns null when the year is implausible.
 */
export function suggestSemester(graduationYear, now = new Date()) {
  if (!graduationYear || graduationYear < 1950 || graduationYear > 2100) return null;

  const admissionYear = graduationYear - 4;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-12, January = 1

  // Fall (odd) semesters start in August of each academic year.
  const fallYear = month >= 8 ? year : year - 1;
  const elapsed = fallYear - admissionYear;
  if (elapsed < 0) return 1;

  const semester = elapsed * 2 + (month >= 8 ? 1 : 2);
  return Math.min(8, Math.max(1, semester));
}
