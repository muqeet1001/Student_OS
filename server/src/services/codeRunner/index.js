import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../../config/env.js';

const CHILD_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runner.child.js');

const MEMORY_LIMIT_MB = 128;
/** Grace period on top of the in-VM timeout before the process is killed. */
const KILL_GRACE_MS = 1500;

export const VERDICTS = {
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  RUNTIME_ERROR: 'runtime_error',
  COMPILE_ERROR: 'compile_error',
  TIMEOUT: 'timeout',
  MEMORY_EXCEEDED: 'memory_exceeded',
  INTERNAL_ERROR: 'internal_error',
};

export const VERDICT_LABELS = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
  timeout: 'Time Limit Exceeded',
  memory_exceeded: 'Memory Limit Exceeded',
  internal_error: 'Judge Error',
};

/**
 * Executes a submission against test cases in a throwaway child process.
 *
 * The child gets a capped heap, an empty environment and no stdin beyond the
 * job payload. If it overruns the deadline it is killed — first politely,
 * then with SIGKILL — so an infinite loop cannot occupy a worker forever.
 */
export function runJavaScript({ code, tests, functionName, timeoutMs = config.codeRunner.timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        `--max-old-space-size=${MEMORY_LIMIT_MB}`,
        '--no-warnings',
        // Deny the child any ability to spawn further inspectors.
        '--disallow-code-generation-from-strings',
        CHILD_SCRIPT,
      ],
      {
        // An empty environment keeps database URIs and API keys out of reach
        // even if the sandbox is escaped.
        env: { NODE_ENV: 'production' },
        cwd: path.dirname(CHILD_SCRIPT),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      },
    );

    let stdout = '';
    let stderr = '';
    let settled = false;
    let killedFor = null;

    const finish = (report) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearTimeout(hardKill);
      resolve(report);
    };

    const deadline = setTimeout(() => {
      killedFor = VERDICTS.TIMEOUT;
      child.kill('SIGTERM');
    }, timeoutMs + KILL_GRACE_MS);

    const hardKill = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, timeoutMs + KILL_GRACE_MS * 2);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > config.codeRunner.maxOutput * 4) {
        killedFor = VERDICTS.RUNTIME_ERROR;
        child.kill('SIGKILL');
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString().slice(0, 4000);
    });

    child.on('error', (error) =>
      finish({
        status: VERDICTS.INTERNAL_ERROR,
        message: `Could not start the judge: ${error.message}`,
        logs: [],
        results: [],
      }),
    );

    child.on('close', (exitCode) => {
      if (killedFor === VERDICTS.TIMEOUT) {
        return finish({
          status: VERDICTS.TIMEOUT,
          message: `Your code did not finish within ${timeoutMs} ms.`,
          logs: [],
          results: [],
        });
      }

      if (killedFor === VERDICTS.RUNTIME_ERROR) {
        return finish({
          status: VERDICTS.RUNTIME_ERROR,
          message: 'Your code produced too much output.',
          logs: [],
          results: [],
        });
      }

      // V8 aborts with a non-zero code and this message when the heap cap is hit.
      if (/heap out of memory|Allocation failed/i.test(stderr)) {
        return finish({
          status: VERDICTS.MEMORY_EXCEEDED,
          message: `Your code exceeded the ${MEMORY_LIMIT_MB} MB memory limit.`,
          logs: [],
          results: [],
        });
      }

      try {
        return finish(JSON.parse(stdout));
      } catch {
        return finish({
          status: VERDICTS.INTERNAL_ERROR,
          message:
            stderr.trim().split('\n').at(-1) ||
            `The judge exited unexpectedly (code ${exitCode}).`,
          logs: [],
          results: [],
        });
      }
    });

    child.stdin.on('error', () => {
      // The child can exit before the payload is fully written; `close`
      // reports the real outcome, so nothing to do here.
    });
    child.stdin.end(JSON.stringify({ code, tests, functionName, timeoutMs }));
  });
}
