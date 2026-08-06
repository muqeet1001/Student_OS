import assert from 'node:assert/strict';
import test from 'node:test';
import { runJavaScript, VERDICTS } from '../src/services/codeRunner/index.js';

const twoSumTests = [
  { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] },
  { input: [[3, 2, 4], 6], expectedOutput: [1, 2] },
];

test('accepts a correct solution', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: twoSumTests,
    code: `
      function twoSum(nums, target) {
        const seen = new Map();
        for (let i = 0; i < nums.length; i++) {
          const need = target - nums[i];
          if (seen.has(need)) return [seen.get(need), i];
          seen.set(nums[i], i);
        }
        return [];
      }
    `,
  });

  assert.equal(report.status, VERDICTS.ACCEPTED);
  assert.equal(report.results.length, 2);
  assert.ok(report.results.every((r) => r.passed));
});

test('reports a wrong answer with the failing case', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: twoSumTests,
    code: 'function twoSum() { return [0, 0]; }',
  });

  assert.equal(report.status, VERDICTS.WRONG_ANSWER);
  assert.equal(report.results[0].passed, false);
  assert.equal(report.results[0].expected, '[0,1]');
  assert.equal(report.results[0].received, '[0,0]');
});

test('reports a syntax error as a compile error', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: twoSumTests,
    code: 'function twoSum( { retur',
  });

  assert.equal(report.status, VERDICTS.COMPILE_ERROR);
  assert.match(report.message, /SyntaxError/);
});

test('requires the expected function name', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: twoSumTests,
    code: 'function somethingElse() { return []; }',
  });

  assert.equal(report.status, VERDICTS.COMPILE_ERROR);
  assert.match(report.message, /must define a function named "twoSum"/);
});

test('surfaces a thrown error as a runtime error', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: twoSumTests,
    code: 'function twoSum() { throw new TypeError("boom"); }',
  });

  assert.equal(report.status, VERDICTS.RUNTIME_ERROR);
  assert.match(report.message, /TypeError: boom/);
});

test('kills an infinite loop instead of hanging', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: twoSumTests,
    timeoutMs: 1000,
    code: 'function twoSum() { while (true) {} }',
  });

  assert.equal(report.status, VERDICTS.TIMEOUT);
});

test('captures console output from the submission', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: [twoSumTests[0]],
    code: `
      function twoSum(nums, target) {
        console.log('checking', nums.length, 'items');
        return [0, 1];
      }
    `,
  });

  assert.equal(report.status, VERDICTS.ACCEPTED);
  assert.deepEqual(report.logs, [{ level: 'log', line: 'checking 4 items' }]);
});

test('tolerates floating point drift', async () => {
  const report = await runJavaScript({
    functionName: 'average',
    tests: [{ input: [[0.1, 0.2]], expectedOutput: 0.15000000000000002 }],
    code: 'function average(xs) { return (0.1 + 0.2) / 2; }',
  });

  assert.equal(report.status, VERDICTS.ACCEPTED);
});

test('does not leak the parent environment into the sandbox', async () => {
  process.env.SECRET_CANARY = 'do-not-leak';

  const report = await runJavaScript({
    functionName: 'peek',
    tests: [{ input: [], expectedOutput: 'unreachable' }],
    code: 'function peek() { return process.env.SECRET_CANARY; }',
  });

  // `process` is absent from the sandbox, so the attempt is a runtime error
  // rather than a successful read.
  assert.equal(report.status, VERDICTS.RUNTIME_ERROR);
  assert.match(report.message, /process is not defined/);

  delete process.env.SECRET_CANARY;
});

test('denies access to require and module loading', async () => {
  const report = await runJavaScript({
    functionName: 'peek',
    tests: [{ input: [], expectedOutput: 'unreachable' }],
    code: 'function peek() { return require("node:fs").readdirSync("/"); }',
  });

  assert.equal(report.status, VERDICTS.RUNTIME_ERROR);
  assert.match(report.message, /require is not defined/);
});

test('a constructor-chain escape cannot reach the host process', async () => {
  const report = await runJavaScript({
    functionName: 'escape',
    tests: [{ input: [], expectedOutput: 'unreachable' }],
    // The classic vm breakout: reach the Function constructor from a literal
    // and ask the outer realm for `process`.
    code: 'function escape() { return this.constructor.constructor("return process")().pid; }',
  });

  assert.notEqual(report.status, VERDICTS.ACCEPTED);
  assert.ok(
    ['runtime_error', 'compile_error', 'internal_error'].includes(report.status),
    `expected a failure verdict, received ${report.status}`,
  );
});

test('marks hidden cases so they can be withheld from the client', async () => {
  const report = await runJavaScript({
    functionName: 'twoSum',
    tests: [{ ...twoSumTests[0], hidden: true, name: 'hidden case' }],
    code: 'function twoSum() { return [0, 1]; }',
  });

  assert.equal(report.results[0].hidden, true);
  assert.equal(report.results[0].name, 'hidden case');
});
