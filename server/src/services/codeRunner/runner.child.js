/**
 * Untrusted-code worker.
 *
 * This file is executed as a SEPARATE PROCESS, never in the API process.
 * `node:vm` on its own is not a security boundary — a determined escape can
 * reach the host realm — so the real containment here is the process itself:
 * the parent caps its heap, strips its environment and kills it on overrun.
 * For hostile input rather than student mistakes, run this behind a container
 * or an isolate (see docs/CODE_EXECUTION.md).
 *
 * Protocol: a JSON job arrives on stdin, a JSON report leaves on stdout.
 */
import vm from 'node:vm';

const MAX_LOG_ENTRIES = 100;
const MAX_LOG_LENGTH = 2000;

function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', reject);
  });
}

/** Structural equality with the loose spots a judge actually needs. */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    // Tolerate floating point drift, which otherwise fails correct solutions.
    if (!Number.isInteger(a) || !Number.isInteger(b)) return Math.abs(a - b) < 1e-9;
    return false;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
  );
}

function display(value) {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildSandbox(logs) {
  const record = (level) => (...args) => {
    if (logs.length >= MAX_LOG_ENTRIES) return;
    const line = args
      .map((arg) => (typeof arg === 'string' ? arg : display(arg)))
      .join(' ')
      .slice(0, MAX_LOG_LENGTH);
    logs.push({ level, line });
  };

  // An explicit allowlist: anything not named here is simply absent from the
  // sandbox, including require, process, fetch and the timer functions.
  const sandbox = {
    console: { log: record('log'), info: record('log'), warn: record('warn'), error: record('error') },
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Promise,
    BigInt,
    Error,
    TypeError,
    RangeError,
    isNaN,
    isFinite,
    parseInt,
    parseFloat,
    Infinity,
    NaN,
    undefined,
  };

  sandbox.globalThis = sandbox;
  return sandbox;
}

async function run({ code, tests = [], functionName, timeoutMs = 4000 }) {
  const logs = [];
  const sandbox = buildSandbox(logs);
  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
  });

  // Load the submission once; a syntax error here is a compile error.
  try {
    new vm.Script(code, { filename: 'solution.js' }).runInContext(context, { timeout: timeoutMs });
  } catch (error) {
    return {
      status: error instanceof SyntaxError ? 'compile_error' : 'runtime_error',
      message: `${error.name}: ${error.message}`,
      logs,
      results: [],
    };
  }

  const target = context[functionName];
  if (typeof target !== 'function') {
    return {
      status: 'compile_error',
      message: `Your code must define a function named "${functionName}".`,
      logs,
      results: [],
    };
  }

  const results = [];
  const startedAll = performance.now();

  for (const test of tests) {
    const args = Array.isArray(test.input) ? test.input : [test.input];
    const startedAt = performance.now();

    try {
      // Re-enter the context so the call itself is bounded by the timeout too,
      // not just the initial load.
      const invoke = new vm.Script('(...args) => __target__(...args)').runInContext(context, {
        timeout: timeoutMs,
      });
      context.__target__ = target;

      const returned = invoke(...structuredClone(args));
      const output = returned instanceof Promise ? await returned : returned;
      const runtimeMs = Number((performance.now() - startedAt).toFixed(3));
      const passed = deepEqual(output, test.expectedOutput);

      results.push({
        name: test.name || '',
        hidden: Boolean(test.hidden),
        passed,
        runtimeMs,
        input: display(args),
        expected: display(test.expectedOutput),
        received: display(output),
      });
    } catch (error) {
      results.push({
        name: test.name || '',
        hidden: Boolean(test.hidden),
        passed: false,
        runtimeMs: Number((performance.now() - startedAt).toFixed(3)),
        input: display(args),
        expected: display(test.expectedOutput),
        received: null,
        error: `${error.name}: ${error.message}`,
      });
      // A thrown error stops the run — later cases would report noise.
      break;
    }
  }

  const failed = results.find((result) => !result.passed);

  return {
    status: !failed ? 'accepted' : failed.error ? 'runtime_error' : 'wrong_answer',
    message: failed?.error || '',
    totalRuntimeMs: Number((performance.now() - startedAll).toFixed(3)),
    memoryBytes: process.memoryUsage().heapUsed,
    logs,
    results,
  };
}

const payload = await readStdin();

try {
  const report = await run(JSON.parse(payload));
  process.stdout.write(JSON.stringify(report));
} catch (error) {
  process.stdout.write(
    JSON.stringify({ status: 'internal_error', message: error.message, logs: [], results: [] }),
  );
}
