import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJobDescription, rankStudents, scoreStudent } from '../src/services/jobMatch.js';
import { canonicalise, extractSkills } from '../src/services/skillTaxonomy.js';

const JD = `Backend Engineer — Graduate Programme

We are hiring backend engineers for our platform team.

Required: strong experience with Node.js, Express and MongoDB.
Must have a solid grasp of data structures and REST APIs.
Preferred: exposure to Docker and AWS is a plus.

Minimum CGPA of 7.5. Open to Computer Science and IT students graduating in 2026.`;

test('extracts required and preferred skills separately', () => {
  const parsed = parseJobDescription(JD);
  const byName = Object.fromEntries(parsed.skills.map((s) => [s.name, s.required]));

  assert.equal(byName['Node.js'], true);
  assert.equal(byName.MongoDB, true);
  assert.equal(byName['Data Structures'], true);
  assert.equal(byName['REST APIs'], true);

  assert.equal(byName.Docker, false, 'Docker is listed under "Preferred"');
  assert.equal(byName.AWS, false, 'AWS is listed under "Preferred"');
});

test('extracts the hard filters a placement officer would apply', () => {
  const parsed = parseJobDescription(JD);

  assert.equal(parsed.minCgpa, 7.5);
  assert.equal(parsed.graduationYear, 2026);
  assert.deepEqual(parsed.branches.sort(), ['Computer Science', 'Information Technology']);
  assert.match(parsed.title, /Backend Engineer/);
});

test('normalises the aliases people actually write', () => {
  assert.equal(canonicalise('JS'), 'JavaScript');
  assert.equal(canonicalise('reactjs'), 'React');
  assert.equal(canonicalise('NodeJS'), 'Node.js');
  assert.equal(canonicalise('k8s'), 'Kubernetes');

  // An unknown skill is preserved rather than silently dropped.
  assert.equal(canonicalise('Blockchain'), 'Blockchain');
});

test('word-boundary matching does not produce false positives', () => {
  // "Go" and "C" are the classic offenders.
  assert.ok(!extractSlim('We have a good going culture').includes('Go'));
  assert.ok(!extractSlim('Excellent communication').includes('C'));
  assert.ok(extractSlim('Experience with Go and C is required').includes('Go'));

  function extractSlim(text) {
    return extractSkills(text);
  }
});

const strongCandidate = {
  readiness: 78,
  solved: 15,
  testAverage: 82,
  interviewAverage: 70,
  profile: {
    branch: 'Computer Science',
    graduationYear: 2026,
    education: [{ grade: '8.6 CGPA' }],
    skills: [
      { name: 'Node.js', verified: true },
      { name: 'Express', verified: false },
      { name: 'MongoDB', verified: true },
      { name: 'Data Structures', verified: true },
      { name: 'REST APIs', verified: false },
    ],
    projects: [{ title: 'API service', techStack: ['Docker'] }],
  },
};

const weakCandidate = {
  readiness: 22,
  solved: 1,
  testAverage: 0,
  interviewAverage: 0,
  profile: {
    branch: 'Mechanical',
    graduationYear: 2027,
    education: [{ grade: '6.2 CGPA' }],
    skills: [{ name: 'Python', verified: false }],
    projects: [],
  },
};

test('ranks a well-matched student far above a poorly matched one', () => {
  const requirements = parseJobDescription(JD);

  const strong = scoreStudent(strongCandidate, requirements);
  const weak = scoreStudent(weakCandidate, requirements);

  assert.ok(strong.score > 70, `expected a strong match, got ${strong.score}`);
  assert.ok(weak.score < 30, `expected a weak match, got ${weak.score}`);
  assert.ok(strong.score - weak.score > 40, 'the gap should be decisive');
});

test('credits a skill proven by a project even when it is not listed', () => {
  const requirements = parseJobDescription(JD);
  const result = scoreStudent(strongCandidate, requirements);

  const docker = result.matched.find((item) => item.name === 'Docker');
  assert.ok(docker, 'Docker came from the project tech stack');
  assert.equal(docker.source, 'project');
});

test('reports what a student is missing rather than only a number', () => {
  const requirements = parseJobDescription(JD);
  const result = scoreStudent(weakCandidate, requirements);

  assert.ok(result.missing.length > 0);
  assert.ok(
    result.missing.some((item) => item.name === 'Node.js'),
    'the student should be told which required skills are absent',
  );
  assert.ok(
    result.blockers.some((item) => item === 'Missing required skill: Node.js'),
    'a missing required skill must affect eligibility, not only ranking',
  );
});

test('surfaces hard-filter failures instead of hiding the student', () => {
  const requirements = parseJobDescription(JD);
  const result = scoreStudent(weakCandidate, requirements);

  assert.ok(result.blockers.length > 0, 'a near-miss must still be visible to staff');
  assert.ok(result.blockers.some((b) => /CGPA/i.test(b)));
  assert.ok(result.blockers.some((b) => /branch/i.test(b) || /Mechanical/.test(b)));
});

test('weights verified skills above self-declared ones', () => {
  const requirements = parseJobDescription(JD);

  const unverified = {
    ...strongCandidate,
    profile: {
      ...strongCandidate.profile,
      skills: strongCandidate.profile.skills.map((s) => ({ ...s, verified: false })),
    },
  };

  const verifiedScore = scoreStudent(strongCandidate, requirements).score;
  const unverifiedScore = scoreStudent(unverified, requirements).score;

  assert.ok(
    verifiedScore > unverifiedScore,
    'a test-verified claim should outrank an unproven one',
  );
});

test('required skills count for more than preferred ones', () => {
  const requirements = parseJobDescription(JD);

  const hasRequired = {
    readiness: 50,
    solved: 5,
    profile: { skills: [{ name: 'Node.js' }, { name: 'MongoDB' }], projects: [] },
  };
  const hasPreferred = {
    readiness: 50,
    solved: 5,
    profile: { skills: [{ name: 'Docker' }, { name: 'AWS' }], projects: [] },
  };

  assert.ok(
    scoreStudent(hasRequired, requirements).score > scoreStudent(hasPreferred, requirements).score,
    'two required skills should beat two preferred ones',
  );
});

test('ranks a cohort and honours the limit', () => {
  const requirements = parseJobDescription(JD);
  const cohort = [weakCandidate, strongCandidate, weakCandidate, strongCandidate];

  const ranked = rankStudents(cohort, requirements, { limit: 2 });

  assert.equal(ranked.length, 2);
  assert.ok(ranked[0].match.score >= ranked[1].match.score, 'results must be sorted');
  assert.ok(ranked[0].match.score > 70, 'the best candidates should come first');
});

test('a job description with no recognisable skills does not crash or fake a match', () => {
  const requirements = parseJobDescription('We are looking for a motivated individual.');
  const result = scoreStudent(strongCandidate, requirements);

  assert.equal(requirements.skills.length, 0);
  assert.equal(result.breakdown.skills, 0, 'no demanded skills means no skill credit');
  assert.ok(Number.isFinite(result.score), 'the score must stay a number');
});
