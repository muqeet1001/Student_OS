import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { SkillAssessment } from '../src/models/SkillAssessment.js';
import { skillAssessments } from '../src/seed/data/skillAssessments.js';
import { canonicalise } from '../src/services/skillTaxonomy.js';

test('every seeded assessment satisfies the schema', () => {
  for (const assessment of skillAssessments) {
    const error = new SkillAssessment(assessment).validateSync();
    assert.equal(
      error,
      undefined,
      `${assessment.skill}: ${error && Object.keys(error.errors).join(', ')}`,
    );
  }
});

test('every question has exactly one correct option', () => {
  for (const assessment of skillAssessments) {
    for (const question of assessment.questions) {
      const correct = question.options.filter((option) => option.isCorrect).length;
      assert.equal(
        correct,
        1,
        `${assessment.skill} — "${question.prompt.slice(0, 45)}" has ${correct} correct options`,
      );
    }
  }
});

test('the schema rejects a question with no correct answer', () => {
  const broken = new SkillAssessment({
    skill: 'Broken',
    questions: [
      {
        prompt: 'No right answer here',
        options: [{ text: 'a' }, { text: 'b' }],
      },
    ],
  });

  assert.ok(broken.validateSync(), 'an unscoreable question must not save');
});

test('assessments cover every tier, so a score maps to a level honestly', () => {
  for (const assessment of skillAssessments) {
    const tiers = new Set(assessment.questions.map((question) => question.tier));

    assert.ok(
      tiers.has('beginner') || tiers.has('intermediate'),
      `${assessment.skill} needs entry-level questions`,
    );
    assert.ok(tiers.has('advanced'), `${assessment.skill} needs questions that separate the top`);
  }
});

test('assessment skills are canonical, so aliases resolve to them', () => {
  for (const assessment of skillAssessments) {
    assert.equal(
      canonicalise(assessment.skill),
      assessment.skill,
      `"${assessment.skill}" is not the canonical form, so a student who typed an alias would never match it`,
    );
  }

  // The point of canonicalising: these all have to reach the same assessment.
  assert.equal(canonicalise('react.js'), 'React');
  assert.equal(canonicalise('NodeJS'), 'Node.js');
  assert.equal(canonicalise('js'), 'JavaScript');
});

test('level thresholds are ordered and reachable', () => {
  for (const assessment of skillAssessments) {
    const doc = new SkillAssessment(assessment);
    const { intermediate, advanced } = doc.thresholds;

    assert.ok(advanced > intermediate, `${assessment.skill}: advanced must sit above intermediate`);
    assert.ok(advanced <= 100, `${assessment.skill}: advanced must be attainable`);

    // A threshold no combination of questions can hit would be unreachable.
    const step = 100 / assessment.questions.length;
    assert.ok(
      step * assessment.questions.length >= advanced,
      `${assessment.skill}: not enough questions to reach ${advanced}%`,
    );
  }
});

test('attempt scoring maps percentages onto the documented levels', () => {
  // Mirrors levelFor in the controller; guards the boundaries specifically.
  const levelFor = (percentage, thresholds) => {
    if (percentage >= thresholds.advanced) return 'advanced';
    if (percentage >= thresholds.intermediate) return 'intermediate';
    return 'beginner';
  };

  const thresholds = { intermediate: 50, advanced: 80 };

  assert.equal(levelFor(100, thresholds), 'advanced');
  assert.equal(levelFor(80, thresholds), 'advanced', 'the threshold itself should qualify');
  assert.equal(levelFor(79, thresholds), 'intermediate');
  assert.equal(levelFor(50, thresholds), 'intermediate');
  assert.equal(levelFor(49, thresholds), 'beginner');
  assert.equal(levelFor(0, thresholds), 'beginner', 'a zero is a level, not a failure');
});

test('a verified level is only ever raised, never lowered by a worse retake', () => {
  // Mirrors the profile-write rule in submitAttempt.
  const RANK = { beginner: 1, intermediate: 2, advanced: 3 };
  const shouldReplace = (existing, next) => !existing.verified || RANK[next] > RANK[existing.level];

  assert.equal(shouldReplace({ verified: true, level: 'intermediate' }, 'advanced'), true);
  assert.equal(
    shouldReplace({ verified: true, level: 'advanced' }, 'beginner'),
    false,
    'a bad retake must not strip a level the student already earned',
  );
  assert.equal(
    shouldReplace({ verified: false, level: 'advanced' }, 'beginner'),
    true,
    'an unverified claim is always replaced by a real result',
  );
});

test('the attempt model requires a server-set deadline', async () => {
  const { SkillAttempt } = await import('../src/models/SkillAssessment.js');

  const attempt = new SkillAttempt({
    user: new mongoose.Types.ObjectId(),
    assessment: new mongoose.Types.ObjectId(),
    skill: 'JavaScript',
  });

  const error = attempt.validateSync();
  assert.ok(error?.errors?.expiresAt, 'without a deadline the clock could never expire');
});
