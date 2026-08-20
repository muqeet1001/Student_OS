import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateReadinessEvidence, normaliseReadinessWeights } from '../src/services/readiness.service.js';

const profile = {
  targetRole: 'software-engineer',
  headline: 'Software engineer',
  bio: 'I build reliable software systems with measured outcomes.',
  location: 'Pune',
  graduationYear: 2027,
  branch: 'CSE',
  skills: [{ name: 'DSA', verified: true }, { name: 'Java', verified: true }],
  projects: [{ title: 'Placement app', description: 'A detailed project description that explains the problem, implementation and measured outcome.', techStack: ['Java'] }],
  education: [{ institution: 'Example College' }],
  links: { github: 'https://github.com/example' },
};

test('readiness has one five-component formula for every consumer', () => {
  const result = calculateReadinessEvidence({
    profile,
    user: { name: 'Student', email: 'student@example.com' },
    solvedCount: 20,
    totalProblems: 100,
    interviewAverage: 70,
  });
  assert.deepEqual(Object.keys(result.values), ['skills', 'coding', 'resume', 'interview', 'projects']);
  assert.equal(result.readiness, Math.round(
    result.values.skills * 0.2 + result.values.coding * 0.3 + result.values.resume * 0.2
      + result.values.interview * 0.2 + result.values.projects * 0.1,
  ));
});

test('institution weights are converted from percentages without mutating defaults', () => {
  const weights = normaliseReadinessWeights({ skills: 10, coding: 40, resume: 20, interview: 20, projects: 10 });
  assert.equal(weights.coding, 0.4);
  assert.ok(Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 1) < Number.EPSILON);
  assert.equal(normaliseReadinessWeights().coding, 0.3);
});

test('coding credit is capped and never exceeds one hundred', () => {
  const result = calculateReadinessEvidence({ profile: {}, solvedCount: 500, totalProblems: 20 });
  assert.equal(result.values.coding, 100);
});
