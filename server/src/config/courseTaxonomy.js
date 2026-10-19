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
 * map semester 1-8 onto focus subjects, and each entry's *level* is derived
 * from that stage's semester through the level bands below — so the calendar is
 * the default and there is one table to keep true rather than two. Semester
 * *recommends*, it never locks — the full catalogue stays reachable through
 * filters.
 */

export const DOMAINS = Object.freeze([
  { id: 'aptitude', label: 'Aptitude' },
  { id: 'cs-core', label: 'CS Core' },
  { id: 'communication', label: 'Communication' },
]);

export const LEVELS = Object.freeze({
  foundation: {
    label: 'Foundation',
    /*
     * The semesters this level covers (inclusive). This is not documentation:
     * it is what a stage's focus levels are derived from, via
     * `levelForSemester`.
     */
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
 * Levels from least to most advanced.
 *
 * The progression lives here rather than being implied by object order, because
 * two things depend on it: which band wins where they overlap, and how far a
 * focus entry is allowed to deviate.
 */
export const LEVEL_ORDER = Object.freeze(['foundation', 'intermediate', 'advanced']);

/**
 * The level a semester falls in, by the highest band that covers it.
 *
 * The bands overlap deliberately — semester 3 is the tail of Foundation and the
 * start of Intermediate, and semesters 5-6 close Intermediate while carrying
 * most of Advanced. A student inside an overlap is aimed at the *higher* level,
 * because that is the one they are moving into rather than the one they are
 * leaving.
 *
 * Returns null outside 1-8 rather than falling back, so a caller can tell
 * "no semester" apart from "foundation".
 */
export function levelForSemester(semester) {
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) return null;

  let match = null;
  for (const id of LEVEL_ORDER) {
    const [from, to] = LEVELS[id].semesterBand;
    if (semester >= from && semester <= to) match = id;
  }
  return match;
}

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
 * Four progressive stages over the eight semesters. `focus` lists the subjects
 * to work on at that stage, in priority order for the practice-hub track panel.
 *
 * An entry's level is *derived* from the stage's last semester via
 * `focusLevelFor`, so the level bands above are the single source of truth for
 * what a student is aimed at. An explicit `level` is an override, for a subject
 * that genuinely runs ahead of or behind its cohort — a subject introduced at
 * that stage, say, which has to open lower. An override may sit at most one
 * tier below the derived level, which `courseTaxonomy.test.js` enforces: a
 * focus subject is allowed to start lower than the stage aims, but it is not
 * allowed to be a whole level of preparation out of step.
 */
export const STAGES = Object.freeze([
  {
    id: 'foundations',
    label: 'Foundations',
    semesters: [1, 2],
    description:
      'Build the base every campus test assumes: core arithmetic and reasoning, clear written English, and first programming habits.',
    // No overrides: at semesters 1-2 the derived level already is Foundation,
    // which is the point of the stage.
    focus: Object.freeze([
      { subjectId: 'quantitative' },
      { subjectId: 'logical' },
      { subjectId: 'verbal' },
      { subjectId: 'cs-foundations' },
      { subjectId: 'dsa' },
      { subjectId: 'communication' },
    ]),
  },
  {
    id: 'core-building',
    label: 'Core building',
    semesters: [3, 4],
    description:
      'Solidify quantitative and logical fluency, learn to think in data structures, and pick up the CS subjects your branch is teaching now.',
    focus: Object.freeze([
      { subjectId: 'quantitative' },
      { subjectId: 'logical' },
      { subjectId: 'dsa' },
      { subjectId: 'data-interpretation' },
      { subjectId: 'oop' },
      /*
       * Databases is taught alongside the theory the branch is sitting at this
       * point, so its aim trails the stage: Foundation here, not Intermediate.
       */
      { subjectId: 'databases', level: 'foundation' },
      { subjectId: 'communication' },
    ]),
  },
  {
    id: 'interview-gear',
    label: 'Interview gear',
    semesters: [5, 6],
    description:
      'Turn knowledge into interview answers: master databases, OS and networks, push DSA further, and start timed mock interviews.',
    focus: Object.freeze([
      { subjectId: 'dsa' },
      /*
       * All three systems subjects appear for the first time at this stage, so
       * each opens a tier below the stage's Advanced aim rather than pretending
       * the student has been doing them for two semesters.
       */
      { subjectId: 'databases', level: 'intermediate' },
      { subjectId: 'os', level: 'intermediate' },
      { subjectId: 'networks', level: 'intermediate' },
      { subjectId: 'quantitative' },
      { subjectId: 'data-interpretation' },
      { subjectId: 'communication' },
    ]),
  },
  {
    id: 'placement-mode',
    label: 'Placement mode',
    semesters: [7, 8],
    description:
      'Everything is aimed at the real process now: previous-year questions, company rounds, timed mocks and your applications.',
    focus: Object.freeze([
      { subjectId: 'dsa' },
      { subjectId: 'databases' },
      { subjectId: 'os' },
      { subjectId: 'networks' },
      { subjectId: 'quantitative' },
      { subjectId: 'data-interpretation' },
      /*
       * Verbal ability is not a ladder that keeps climbing — "Advanced verbal"
       * would mean harder English rather than better answers — so it stays
       * where it is useful instead of following the stage up to Advanced.
       */
      { subjectId: 'verbal', level: 'intermediate' },
      { subjectId: 'communication' },
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
 * The semester a stage's focus levels are derived from: its last one.
 *
 * "The level you should be at by the end of this stage", not the level you
 * arrived with — a semester-3 student pointed at Foundation because that is
 * where the stage began would be told to revise what they already know.
 */
export function focusReferenceSemester(stage) {
  return stage?.semesters?.[1] ?? null;
}

/**
 * The level a focus entry aims at.
 *
 * Derived from the stage's semester by default, so a subject's aim follows the
 * calendar and nobody has to remember to move it as a cohort progresses. An
 * entry carries its own `level` only to override that.
 */
export function focusLevelFor(stage, entry) {
  return entry?.level ?? levelForSemester(focusReferenceSemester(stage));
}

/**
 * Enrich a stage's focus list with subject/domain/level labels, ready to
 * render or serialise.
 *
 * The level is resolved here rather than read off the entry, so callers get a
 * level whether it was derived or overridden and never have to know which.
 */
export function stageFocus(stage) {
  if (!stage) return [];
  return stage.focus.map((entry) => {
    const subject = SUBJECT_BY_ID.get(entry.subjectId);
    const levelId = focusLevelFor(stage, entry);
    const level = LEVELS[levelId];
    return {
      subjectId: entry.subjectId,
      subjectLabel: subject?.label ?? entry.subjectId,
      domain: subject?.domain ?? null,
      domainLabel: subject ? DOMAIN_BY_ID.get(subject.domain)?.label ?? null : null,
      level: levelId,
      levelLabel: level?.label ?? levelId,
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
