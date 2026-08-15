import assert from 'node:assert/strict';
import test from 'node:test';

import { VERDICTS } from '../src/services/codeRunner/index.js';
import { __testing } from '../src/services/codeRunner/judge0.js';

const { buildHarness, judge0Failure, normalizeReport } = __testing;

test('Judge0 harness embeds the requested function and test cases', () => {
  const { marker, source } = buildHarness({
    code: 'function add(a, b) { return a + b; }',
    functionName: 'add',
    tests: [{ name: 'small values', input: [2, 3], expectedOutput: 5, hidden: false }],
  });

  assert.match(marker, /^__STUDENT_OS_[a-f0-9]{24}__$/);
  assert.match(source, /function add\(a, b\)/);
  assert.match(source, /small values/);
  assert.match(source, /context\["add"\]/);
});

test('Judge0 harness rejects an unsafe function identifier', () => {
  assert.throws(
    () => buildHarness({ code: '', functionName: 'fn; process.exit()', tests: [] }),
    /invalid function name/,
  );
});

test('Judge0 failures map provider statuses to app verdicts', () => {
  assert.deepEqual(judge0Failure({ status: { id: 5 } }, 200), {
    status: VERDICTS.TIMEOUT,
    message: 'Time limit exceeded.',
  });
  assert.deepEqual(judge0Failure({ status: { id: 6 }, compile_output: 'bad syntax' }, 200), {
    status: VERDICTS.COMPILE_ERROR,
    message: 'bad syntax',
  });
  assert.deepEqual(judge0Failure({ status: { id: 12 }, stderr: 'limit' }, 200), {
    status: VERDICTS.MEMORY_EXCEEDED,
    message: 'limit',
  });
  assert.equal(judge0Failure({ status: { id: 8 }, stderr: 'boom' }, 200).status, VERDICTS.RUNTIME_ERROR);
  assert.equal(judge0Failure({ status: { id: 99 } }, 502).status, VERDICTS.INTERNAL_ERROR);
});

test('Judge0 parser accepts complete reports and rejects malformed output', () => {
  const report = { status: VERDICTS.ACCEPTED, message: '', logs: [], results: [] };
  assert.equal(normalizeReport(report), report);

  assert.throws(() => normalizeReport(null), /malformed result/);
  assert.throws(
    () => normalizeReport({ status: 'surprise', logs: [], results: [] }),
    /malformed result/,
  );
  assert.throws(
    () => normalizeReport({ status: VERDICTS.ACCEPTED, logs: {}, results: [] }),
    /malformed result/,
  );
});
