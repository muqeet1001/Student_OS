import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTodayPlan } from '../src/services/todayPlan.js';

/*
 * The daily plan is the dashboard's answer to "what should I do next", so a
 * task that ticks itself early is worse than no task: it removes the item from
 * the list while the work it names is still undone.
 *
 * The case pinned here is "Solve 3 DSA problems", which used to be marked done
 * by any accepted submission that day — one problem, three asked for.
 */

const components = [
  { key: 'skills', value: 40 },
  { key: 'coding', value: 30 },
  { key: 'resume', value: 95 },
  { key: 'interview', value: 80 },
  { key: 'projects', value: 80 },
];

/** Only the coding task qualifies, so assertions cannot pass by accident. */
function planFor(todaySolved) {
  return buildTodayPlan({
    components,
    coding: {
      totalSolved: 5,
      solved: { easy: 5, medium: 0, hard: 0 },
      streak: todaySolved === undefined ? { current: 0 } : { current: 1, todaySolved },
    },
    tests: { taken: 2 },
    interviews: { completed: 1 },
    profile: { projects: [{}, {}] },
    roleMatch: { missing: [], role: { label: 'SDE', codingTarget: 60 } },
  });
}

test('the daily problem task is not complete after one submission', () => {
  const { tasks, completed } = planFor(1);
  const task = tasks.find((entry) => entry.id === 'solve-problems');

  assert.ok(task, 'the coding task should still be offered');
  assert.equal(task.done, false, 'one problem is progress, not completion');
  assert.equal(task.hint, '1 of 3 done today');
  assert.equal(completed, 0);
});

test('the daily problem task completes on the third submission', () => {
  const { tasks, completed } = planFor(3);
  const task = tasks.find((entry) => entry.id === 'solve-problems');

  assert.equal(task.done, true);
  assert.equal(task.hint, '3 of 3 done today');
  assert.equal(completed, 1);
});

test('a streak with no count of today still leaves the task open', () => {
  // Older payloads carried only `lastSolvedAt`; the plan must not read a
  // missing count as "solved".
  const task = planFor(undefined).tasks.find((entry) => entry.id === 'solve-problems');

  assert.equal(task.done, false);
  assert.equal(task.hint, 'Keeps your streak alive');
});
