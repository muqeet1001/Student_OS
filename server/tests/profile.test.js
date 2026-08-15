import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateProfileCompleteness, Profile } from '../src/models/Profile.js';

test('an empty lean profile has zero completeness', () => {
  assert.equal(calculateProfileCompleteness({}), 0);
});

test('a complete lean profile earns every completeness point', () => {
  const profile = {
    headline: 'Backend engineer',
    bio: 'I build reliable APIs.',
    location: 'Chennai',
    graduationYear: 2026,
    branch: 'CSE',
    skills: Array.from({ length: 5 }, (_, index) => ({ name: `Skill ${index}` })),
    projects: [{ title: 'One' }, { title: 'Two' }],
    education: [{ institution: 'Example College' }],
    links: { github: 'https://github.com/example' },
  };

  assert.equal(calculateProfileCompleteness(profile), 100);
});

test('the pure calculator and document method agree', () => {
  const document = new Profile({
    headline: 'Frontend engineer',
    skills: Array.from({ length: 5 }, (_, index) => ({ name: `Skill ${index}` })),
  });

  assert.equal(document.completeness(), calculateProfileCompleteness(document));
  assert.equal(document.completeness(), 30);
});

test('one professional link is sufficient for the link points', () => {
  assert.equal(calculateProfileCompleteness({ links: { linkedin: 'https://linkedin.com/in/example' } }), 10);
});
