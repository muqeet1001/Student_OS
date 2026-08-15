import crypto from 'node:crypto';
import { config } from '../../config/env.js';
import { VERDICTS } from './index.js';

let cachedLanguageId = null;

function requestHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (config.codeRunner.apiKey) headers[config.codeRunner.apiKeyHeader] = config.codeRunner.apiKey;
  return headers;
}

async function resolveJavaScriptLanguageId(signal) {
  if (config.codeRunner.languageId) return config.codeRunner.languageId;
  if (cachedLanguageId) return cachedLanguageId;

  const response = await fetch(`${config.codeRunner.apiUrl}/languages/`, {
    headers: requestHeaders(),
    signal,
  });
  if (!response.ok) throw new Error(`Could not read live judge languages (HTTP ${response.status}).`);

  const languages = await response.json();
  const candidates = languages
    .filter((item) => /^JavaScript \(Node\.js /i.test(item.name))
    .sort((a, b) => {
      const major = (item) => Number(item.name.match(/Node\.js (\d+)/i)?.[1] || 0);
      return major(b) - major(a);
    });
  if (!candidates.length) throw new Error('The live judge has no JavaScript runtime installed.');

  cachedLanguageId = candidates[0].id;
  return cachedLanguageId;
}

function display(value) {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Build a self-contained Judge0 program that applies the submitted function to every case. */
function buildHarness({ code, tests, functionName }) {
  if (!/^[A-Za-z_$][\w$]*$/.test(functionName)) {
    throw new Error('The problem has an invalid function name.');
  }

  const marker = `__STUDENT_OS_${crypto.randomBytes(12).toString('hex')}__`;
  const payload = JSON.stringify(tests);
  const submittedCode = JSON.stringify(code);

  return {
    marker,
    source: `
const vm = require('node:vm');
const __studentLogs = [];
const __studentDisplay = (value) => {
  if (value === undefined) return 'undefined';
  try { return JSON.stringify(value); } catch { return String(value); }
};
const __studentConsole = {};
for (const level of ['log', 'info', 'warn', 'error']) {
  __studentConsole[level] = (...args) => {
    if (__studentLogs.length >= 100) return;
    __studentLogs.push({
      level: level === 'info' ? 'log' : level,
      line: args.map((value) => typeof value === 'string' ? value : __studentDisplay(value)).join(' ').slice(0, 2000),
    });
  };
}
const __studentEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    if (!Number.isInteger(a) || !Number.isInteger(b)) return Math.abs(a - b) < 1e-9;
    return false;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((item, index) => __studentEqual(item, b[index]));
  const aKeys = Object.keys(a); const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && __studentEqual(a[key], b[key]));
};
(async () => {
  const sandbox = {
    console: __studentConsole, Math, JSON, Object, Array, String, Number,
    Boolean, Date, RegExp, Map, Set, WeakMap, WeakSet, Symbol, Promise,
    BigInt, Error, TypeError, RangeError, isNaN, isFinite, parseInt, parseFloat,
    Infinity, NaN, undefined,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  try {
    new vm.Script(${submittedCode}, { filename: 'solution.js' }).runInContext(context);
  } catch (error) {
    process.stdout.write('${marker}' + JSON.stringify({
      status: error instanceof SyntaxError ? 'compile_error' : 'runtime_error',
      message: error.name + ': ' + error.message, logs: __studentLogs, results: [],
    }));
    return;
  }
  const __target = context[${JSON.stringify(functionName)}];
  if (!__target) throw new Error('Your code must define a function named "${functionName}".');
  const __tests = ${payload};
  const __results = [];
  const __startedAll = Date.now();
  for (const test of __tests) {
    const args = Array.isArray(test.input) ? test.input : [test.input];
    const started = Date.now();
    try {
      context.__target = __target;
      context.__args = JSON.parse(JSON.stringify(args));
      const returned = new vm.Script('__target(...__args)').runInContext(context);
      const output = returned instanceof Promise ? await returned : returned;
      __results.push({
        name: test.name || '', hidden: Boolean(test.hidden),
        passed: __studentEqual(output, test.expectedOutput),
        runtimeMs: Date.now() - started,
        input: __studentDisplay(args), expected: __studentDisplay(test.expectedOutput),
        received: __studentDisplay(output),
      });
    } catch (error) {
      __results.push({
        name: test.name || '', hidden: Boolean(test.hidden), passed: false,
        runtimeMs: Date.now() - started,
        input: __studentDisplay(args), expected: __studentDisplay(test.expectedOutput),
        received: null, error: error.name + ': ' + error.message,
      });
      break;
    }
  }
  const failed = __results.find((result) => !result.passed);
  const report = {
    status: !failed ? 'accepted' : failed.error ? 'runtime_error' : 'wrong_answer',
    message: (failed && failed.error) || '',
    totalRuntimeMs: Date.now() - __startedAll,
    logs: __studentLogs, results: __results,
  };
  process.stdout.write('${marker}' + JSON.stringify(report));
})().catch((error) => {
  process.stdout.write('${marker}' + JSON.stringify({
    status: error.message.includes('must define a function') ? 'compile_error' : 'runtime_error',
    message: error.name + ': ' + error.message, logs: __studentLogs, results: [],
  }));
});
`,
  };
}

function judge0Failure(payload, responseStatus) {
  const statusId = payload?.status?.id;
  const compile = payload?.compile_output;
  const runtime = payload?.stderr || payload?.message;

  if (statusId === 5) return { status: VERDICTS.TIMEOUT, message: 'Time limit exceeded.' };
  // JavaScript is interpreted, so Judge0 reports parser failures as a runtime
  // status even though they are compile errors from the student's point of view.
  if (/SyntaxError:/i.test(runtime || '')) {
    return { status: VERDICTS.COMPILE_ERROR, message: runtime };
  }
  if (statusId === 6) return { status: VERDICTS.COMPILE_ERROR, message: compile || 'Compilation failed.' };
  if (statusId === 12) return { status: VERDICTS.MEMORY_EXCEEDED, message: runtime || 'Memory limit exceeded.' };
  if (statusId >= 7 && statusId <= 11) return { status: VERDICTS.RUNTIME_ERROR, message: runtime || 'Runtime error.' };
  return {
    status: VERDICTS.INTERNAL_ERROR,
    message: runtime || compile || `The live judge returned HTTP ${responseStatus}.`,
  };
}

function normalizeReport(report) {
  const knownVerdicts = new Set(Object.values(VERDICTS));
  if (!report || !knownVerdicts.has(report.status) || !Array.isArray(report.logs) || !Array.isArray(report.results)) {
    throw new Error('The live judge returned a malformed result.');
  }
  return report;
}

export async function runWithJudge0({ code, tests, functionName, timeoutMs }) {
  const { marker, source } = buildHarness({ code, tests, functionName });
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), config.codeRunner.remoteTimeoutMs);

  try {
    const headers = requestHeaders();
    const languageId = await resolveJavaScriptLanguageId(controller.signal);

    const response = await fetch(
      `${config.codeRunner.apiUrl}/submissions?wait=true&base64_encoded=false`,
      {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          language_id: languageId,
          source_code: source,
          cpu_time_limit: Math.max(1, Math.ceil(timeoutMs / 1000)),
          wall_time_limit: Math.max(2, Math.ceil(timeoutMs / 1000) + 2),
          memory_limit: 128_000,
        }),
      },
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status?.id !== 3) {
      return { ...judge0Failure(payload, response.status), logs: [], results: [], engine: 'Judge0' };
    }

    const stdout = String(payload.stdout || '');
    const at = stdout.lastIndexOf(marker);
    if (at < 0) {
      return {
        status: VERDICTS.INTERNAL_ERROR,
        message: 'The live judge returned an incomplete result.',
        logs: [],
        results: [],
        engine: 'Judge0',
      };
    }

    const report = normalizeReport(JSON.parse(stdout.slice(at + marker.length)));
    return {
      ...report,
      engine: 'Judge0',
      remoteRuntimeMs: payload.time ? Math.round(Number(payload.time) * 1000) : undefined,
      memoryBytes: payload.memory ? Number(payload.memory) * 1024 : undefined,
    };
  } finally {
    clearTimeout(abort);
  }
}

export const __testing = { buildHarness, display, judge0Failure, normalizeReport };
