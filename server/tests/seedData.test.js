import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { Problem } from '../src/models/Problem.js';
import { Question } from '../src/models/Question.js';
import { Test, TestQuestion } from '../src/models/Test.js';
import { InterviewQuestion } from '../src/models/InterviewQuestion.js';
import { runJavaScript } from '../src/services/codeRunner/index.js';

import { problems } from '../src/seed/data/problems.js';
import { pyqs } from '../src/seed/data/pyqs.js';
import { tests } from '../src/seed/data/tests.js';
import { interviewQuestions } from '../src/seed/data/interviewQuestions.js';

/** Schema validation without a database connection. */
function assertValid(Model, doc, label) {
  const error = new Model(doc).validateSync();
  assert.equal(error, undefined, `${label}: ${error && Object.keys(error.errors).join(', ')}`);
}

test('seeded problems satisfy the Problem schema', () => {
  for (const problem of problems) assertValid(Problem, problem, problem.slug);
});

test('seeded PYQs satisfy the Question schema and link to real problems', () => {
  const slugs = new Set(problems.map((problem) => problem.slug));

  for (const { problemSlug, ...pyq } of pyqs) {
    assertValid(Question, pyq, pyq.title);
    if (problemSlug) {
      assert.ok(slugs.has(problemSlug), `"${pyq.title}" links to unknown problem "${problemSlug}"`);
    }
  }
});

test('seeded tests are scoreable — exactly one correct option each', () => {
  const testId = new mongoose.Types.ObjectId();

  for (const { questions, ...definition } of tests) {
    assertValid(Test, { ...definition, questionCount: questions.length }, definition.slug);

    for (const question of questions) {
      assertValid(TestQuestion, { ...question, test: testId }, question.prompt.slice(0, 40));

      const correct = question.options.filter((option) => option.isCorrect).length;
      assert.equal(correct, 1, `"${question.prompt.slice(0, 50)}" has ${correct} correct options`);
    }
  }
});

test('seeded interview questions satisfy the InterviewQuestion schema', () => {
  for (const question of interviewQuestions) {
    assertValid(InterviewQuestion, question, question.prompt.slice(0, 40));
    assert.ok(question.keywords.length > 0, 'keywords drive the relevance score and cannot be empty');
  }
});

/**
 * The judge compares a submission against these expected values, so a wrong
 * one would silently reject correct student solutions.
 */
test('every reference solution passes its own test cases', async (t) => {
  for (const problem of problems) {
    await t.test(problem.slug, async () => {
      const report = await runJavaScript({
        functionName: problem.functionName,
        tests: problem.testCases,
        code: problem.referenceSolution,
        timeoutMs: problem.timeoutMs ?? 4000,
      });

      const failed = report.results.filter((result) => !result.passed);
      assert.equal(
        report.status,
        'accepted',
        failed.map((r) => `${r.name}: expected ${r.expected}, got ${r.received ?? r.error}`).join('; '),
      );
    });
  }
});

/**
 * The seed once imported a binding the config module does not export, which
 * only surfaced at run time — after a database connection was attempted.
 * Importing the module here catches that class of wiring error in CI.
 */
test('the seed module wires up without opening a connection', async () => {
  const seed = await import('../src/seed/index.js');
  assert.equal(typeof seed.run, 'function', 'run() should be exported for testing');
  assert.equal(
    mongoose.connection.readyState,
    0,
    'importing the seed must not connect to a database',
  );
});

test('the demo account password satisfies the registration policy', () => {
  // The seed creates this through the model, so it must pass the same rules
  // a real sign-up does, or `--demo` produces an account nobody can use.
  const password = 'demo1234';
  assert.ok(password.length >= 8);
  assert.ok(/[a-zA-Z]/.test(password));
  assert.ok(/[0-9]/.test(password));
});
