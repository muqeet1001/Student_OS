# Code execution

Student OS judges JavaScript submissions itself rather than calling out to a
third-party service. This note explains what the sandbox does and does not
protect against, so the trade-off is a deliberate one.

## How a submission runs

1. `POST /api/problems/:slug/run` or `/submit` validates the payload and
   applies a per-user rate limit (20 executions per minute).
2. `runJavaScript()` spawns a **fresh child process** per execution:
   `node --max-old-space-size=128 --disallow-code-generation-from-strings runner.child.js`
3. The job (code, test cases, function name, timeout) is written to the
   child's stdin as JSON. The report comes back on stdout as JSON.
4. The child evaluates the submission with `node:vm` in a context built from
   an explicit allowlist of globals, then calls the required function once per
   test case and compares the return value.
5. The parent kills the child if it overruns the deadline — `SIGTERM` first,
   then `SIGKILL`.

## What is contained

- **Infinite loops and long runs.** `vm.runInContext` carries a timeout, and
  the parent kills the process regardless. Verdict: `timeout`.
- **Memory exhaustion.** The heap is capped at 128 MB; V8 aborts past that and
  the parent maps the abort to `memory_exceeded`.
- **Filesystem and network access.** `require`, `process`, `fetch`, and the
  timer functions are simply absent from the sandbox context.
- **Secret disclosure.** The child is spawned with an environment containing
  only `NODE_ENV`, so the database URI and API keys are not present in the
  process at all — not merely hidden behind a sandbox check.
- **Output flooding.** Console capture is capped, and the parent kills a child
  that writes more than the configured limit to stdout.

There are tests covering each of these in `server/tests/codeRunner.test.js`,
including a `this.constructor.constructor("return process")()` breakout
attempt.

## What is NOT contained

**`node:vm` is not a security boundary.** The Node documentation says so
explicitly, and new escapes are found periodically. The meaningful isolation
here is the *process*: a successful vm escape lands in a short-lived child with
a capped heap and an empty environment, not in the API process.

That is appropriate for the threat model this feature actually has — students
running their own practice solutions, where the realistic failure is an
accidental infinite loop. It is **not** sufficient for running deliberately
hostile code from anonymous users.

If you open submissions to untrusted users, replace the executor with a real
isolation layer. `runJavaScript()` is a single function with a narrow
signature, so swapping it out means changing one module:

- **Containers** — run `runner.child.js` inside a per-submission Docker
  container with `--network=none`, a read-only root filesystem, a pids limit
  and dropped capabilities.
- **isolate** — the sandbox used by competitive judges; the strongest option
  on Linux.
- **A hosted judge** — Judge0 or Piston, which also unlocks other languages.

## Adding another language

The current judge is JavaScript-only, which is why `Submission.language` is an
enum with one member rather than a free string — adding a language means adding
a value there, a runner module, and a starter template on the problem.
