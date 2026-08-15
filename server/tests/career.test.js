import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGitHubRepo, scoreRepository } from '../src/services/githubAnalyzer.js';
import { githubAnalysisSchema, mentorSchema } from '../src/validators/career.validators.js';

test('GitHub analyzer accepts only an exact public repository path', () => {
  assert.deepEqual(parseGitHubRepo('https://github.com/student/placement-project.git'), {
    owner: 'student', repo: 'placement-project',
  });
  assert.throws(() => parseGitHubRepo('https://example.com/student/project'), /Only github.com/);
  assert.throws(() => parseGitHubRepo('https://github.com/student'), /repository URL/);
});

test('repository score is transparent and improvement-oriented', () => {
  const result = scoreRepository({
    repository: {
      description: 'A placement application tracker with evidence-based recommendations.',
      pushed_at: new Date().toISOString(),
      license: { key: 'mit' },
      homepage: 'https://example.test',
      topics: ['placements', 'react', 'node'],
    },
    languages: { JavaScript: 900, CSS: 100 },
    readme: 'x'.repeat(600),
  });
  assert.equal(result.score, 100);
  assert.equal(result.checks.every((check) => check.passed), true);
  assert.deepEqual(result.languages, ['JavaScript', 'CSS']);
});

test('an empty repository receives specific fixes instead of a fake score', () => {
  const result = scoreRepository({ repository: { pushed_at: '2020-01-01', topics: [] } });
  assert.equal(result.score, 0);
  assert.equal(result.checks.every((check) => check.fix), true);
});

test('career inputs are bounded', () => {
  assert.equal(mentorSchema.safeParse({ message: 'hi' }).success, false);
  assert.equal(mentorSchema.safeParse({ message: 'How should I prepare?' }).success, true);
  assert.equal(githubAnalysisSchema.safeParse({ repoUrl: 'not-a-url' }).success, false);
});
