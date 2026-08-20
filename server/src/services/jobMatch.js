/**
 * Job-description parsing and student matching.
 *
 * Runs in both directions from one engine:
 *   - a placement officer pastes a JD and gets a ranked shortlist
 *   - a student sees open roles ranked by how well they fit
 *
 * Deterministic and explainable by design. A shortlist that decides who gets
 * an interview must be able to answer "why this student?" — every point here
 * traces to a named signal, and every gap is reported back so the student
 * knows what to close.
 */
import { canonicalise, extractSkills } from './skillTaxonomy.js';

/**
 * Weighting. Skills dominate because they are what a JD actually asks for;
 * the rest separates candidates who look alike on paper.
 */
const WEIGHTS = {
  skills: 0.5,
  verified: 0.15,
  readiness: 0.2,
  evidence: 0.15,
};

/** Skills named in a "required/must have" sentence carry more weight. */
const REQUIRED_CUE = /\b(required|must[- ]have|essential|mandatory|strong(ly)? (in|with))\b/i;
const PREFERRED_CUE = /\b(preferred|nice[- ]to[- ]have|bonus|plus|good to have|desirable)\b/i;

const CGPA = /\b(?:cgpa|gpa|percentage)\s*(?:of|:|>=|above|minimum|min\.?)?\s*([0-9]+(?:\.[0-9]+)?)/i;
const GRAD_YEAR = /\b(?:batch|graduat\w*|passing out|class)\s*(?:of|in|during|:|-)?\s*(20[2-9][0-9])/i;
const EXPERIENCE = /\b([0-9]+)\+?\s*(?:years?|yrs?)\b/i;

/**
 * Each branch carries one or more patterns. "IT" is matched case-sensitively
 * and uppercase only — a case-insensitive \bit\b would fire on the English
 * pronoun in nearly every job description.
 */
const BRANCHES = [
  ['Computer Science', [/\b(computer science|cse|c\.s\.e)\b/i]],
  ['Information Technology', [/\binformation technology\b/i, /\bIT\b/]],
  ['Electronics', [/\b(electronics|ece|e\.c\.e)\b/i]],
  ['Electrical', [/\b(electrical|eee)\b/i]],
  ['Mechanical', [/\bmechanical\b/i]],
  ['Civil', [/\bcivil\b/i]],
];

/**
 * Pulls structured requirements out of free-text job description.
 *
 * @param {string} text Raw JD, as pasted.
 * @returns {{skills: Array<{name: string, required: boolean}>, minCgpa: number|null,
 *   graduationYear: number|null, branches: string[], minExperienceYears: number|null,
 *   title: string}}
 */
export function parseJobDescription(text) {
  const raw = String(text ?? '');

  // Sentence-level scan, so "required" in one bullet does not mark every
  // skill in the document as required.
  // Split at real sentence boundaries without breaking dotted technology
  // names such as Node.js, Next.js and .NET into phantom skills.
  const sentences = raw
    .split(/[\n;•·]+|[.!?](?=\s+[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const required = new Set();
  const preferred = new Set();

  for (const sentence of sentences) {
    const found = extractSkills(sentence);
    if (found.length === 0) continue;

    const isPreferred = PREFERRED_CUE.test(sentence);
    const isRequired = REQUIRED_CUE.test(sentence);

    for (const skill of found) {
      if (isPreferred && !isRequired) preferred.add(skill);
      else required.add(skill);
    }
  }

  // Anything mentioned only outside a cued sentence still counts, as most
  // JDs list skills without saying "required".
  for (const skill of extractSkills(raw)) {
    if (!required.has(skill) && !preferred.has(skill)) required.add(skill);
  }

  for (const skill of preferred) required.delete(skill);

  const cgpaMatch = raw.match(CGPA);
  const yearMatch = raw.match(GRAD_YEAR);
  const expMatch = raw.match(EXPERIENCE);

  // The first non-empty line is the title far more often than not.
  const title = (raw.split('\n').find((line) => line.trim())?.trim() ?? '').slice(0, 120);

  return {
    title,
    skills: [
      ...[...required].map((name) => ({ name, required: true })),
      ...[...preferred].map((name) => ({ name, required: false })),
    ],
    minCgpa: cgpaMatch ? Number(cgpaMatch[1]) : null,
    graduationYear: yearMatch ? Number(yearMatch[1]) : null,
    branches: BRANCHES.filter(([, patterns]) => patterns.some((p) => p.test(raw))).map(
      ([name]) => name,
    ),
    minExperienceYears: expMatch ? Number(expMatch[1]) : null,
  };
}

/** Numeric grade from the free-text grade field ("9.1 CGPA", "82%"). */
function parseGrade(education = []) {
  for (const entry of education) {
    const match = String(entry.grade ?? '').match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!match) continue;

    const value = Number(match[1]);
    // Percentages are converted to a 10-point scale so one comparison works.
    return value > 10 ? value / 10 : value;
  }
  return null;
}

/**
 * Scores one student against parsed requirements.
 *
 * @param {object} student `{ profile, readiness, solved, testAverage, interviewAverage }`
 * @param {object} requirements Output of `parseJobDescription`.
 */
export function scoreStudent(student, requirements) {
  const profile = student.profile ?? {};
  const studentSkills = (profile.skills ?? []).map((skill) => ({
    name: canonicalise(skill.name),
    verified: Boolean(skill.verified),
    level: skill.level,
  }));

  // Project tech stacks count as evidence of a skill even when the student
  // never added it to their skill list.
  const projectSkills = new Set(
    (profile.projects ?? []).flatMap((project) =>
      (project.techStack ?? []).map((tech) => canonicalise(tech)),
    ),
  );

  const byName = new Map(studentSkills.map((skill) => [skill.name, skill]));

  const matched = [];
  const missing = [];

  for (const requirement of requirements.skills) {
    const held = byName.get(requirement.name);
    const viaProject = projectSkills.has(requirement.name);

    if (held || viaProject) {
      matched.push({
        name: requirement.name,
        required: requirement.required,
        verified: Boolean(held?.verified),
        source: held ? 'skills' : 'project',
      });
    } else {
      missing.push({ name: requirement.name, required: requirement.required });
    }
  }

  // Required skills are weighted double against preferred ones.
  const weightOf = (item) => (item.required ? 2 : 1);
  const demanded = requirements.skills.reduce((sum, item) => sum + weightOf(item), 0);
  const met = matched.reduce((sum, item) => sum + weightOf(item), 0);

  const skillScore = demanded ? (met / demanded) * 100 : 0;

  const verifiedMatches = matched.filter((item) => item.verified).length;
  const verifiedScore = matched.length ? (verifiedMatches / matched.length) * 100 : 0;

  // Independent proof the student can do the work at all.
  const evidenceScore = Math.min(
    100,
    (student.solved ?? 0) * 4 +
      (student.testAverage ?? 0) * 0.4 +
      (student.interviewAverage ?? 0) * 0.2 +
      (profile.projects?.length ?? 0) * 8,
  );

  let score = Math.round(
    skillScore * WEIGHTS.skills +
      verifiedScore * WEIGHTS.verified +
      (student.readiness ?? 0) * WEIGHTS.readiness +
      evidenceScore * WEIGHTS.evidence,
  );

  // Hard filters are reported rather than silently dropping a student — a
  // placement officer needs to see a near-miss and decide.
  const blockers = [];
  const grade = profile.cgpa ?? parseGrade(profile.education);

  for (const skill of missing.filter((item) => item.required)) {
    blockers.push(`Missing required skill: ${skill.name}`);
  }

  if (requirements.minCgpa != null && grade != null && grade < requirements.minCgpa) {
    blockers.push(`CGPA ${grade} is below the required ${requirements.minCgpa}`);
  }
  if (
    requirements.graduationYear != null &&
    profile.graduationYear != null &&
    profile.graduationYear !== requirements.graduationYear
  ) {
    blockers.push(`Graduates ${profile.graduationYear}, not ${requirements.graduationYear}`);
  }
  if (
    requirements.branches.length > 0 &&
    profile.branch &&
    !requirements.branches.includes(profile.branch)
  ) {
    blockers.push(`${profile.branch} is outside the listed branches`);
  }

  if (blockers.length > 0) score = Math.round(score * 0.5);

  const reasons = [];
  const requiredMatched = matched.filter((item) => item.required);
  const requiredTotal = requirements.skills.filter((item) => item.required).length;

  if (requiredTotal > 0) {
    reasons.push(`Matches ${requiredMatched.length}/${requiredTotal} required skills`);
  }
  if (verifiedMatches > 0) {
    reasons.push(`${verifiedMatches} matched ${verifiedMatches === 1 ? 'skill is' : 'skills are'} test-verified`);
  }
  if ((student.solved ?? 0) > 0) reasons.push(`${student.solved} problems solved`);
  if ((profile.projects?.length ?? 0) > 0) {
    reasons.push(`${profile.projects.length} ${profile.projects.length === 1 ? 'project' : 'projects'}`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matched,
    missing,
    blockers,
    reasons,
    breakdown: {
      skills: Math.round(skillScore),
      verified: Math.round(verifiedScore),
      readiness: Math.round(student.readiness ?? 0),
      evidence: Math.round(evidenceScore),
    },
  };
}

/** Ranks a cohort against one job description. */
export function rankStudents(students, requirements, { limit = 20 } = {}) {
  return students
    .map((student) => ({ ...student, match: scoreStudent(student, requirements) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}
