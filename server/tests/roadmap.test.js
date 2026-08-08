import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRoadmap } from '../src/services/roadmap.service.js';

const base = {
  components: [{ key: 'interview', label: 'Interview', value: 0 }],
  coding: { solved: { easy: 0, medium: 0, hard: 0 }, totalSolved: 0 },
  tests: { taken: 0 },
  interviews: { completed: 0 },
  resume: { atsScore: 0, checks: [] },
  profile: { skills: [], projects: [] },
  roleMatch: null,
};

test('a brand new student has everything to do and nothing done', () => {
  const { weeks, progress } = buildRoadmap(base);

  assert.equal(weeks.length, 4);
  assert.equal(progress.done, 0);
  assert.equal(progress.percentage, 0);
  assert.ok(weeks.every((week) => !week.complete));
});

test('tasks complete from evidence rather than from a checkbox', () => {
  const advanced = buildRoadmap({
    ...base,
    components: [{ key: 'interview', label: 'Interview', value: 75 }],
    coding: { solved: { easy: 30, medium: 20, hard: 4 }, totalSolved: 54 },
    tests: { taken: 2 },
    interviews: { completed: 3 },
    resume: { atsScore: 84, checks: [{ label: 'Quantified achievements', passed: true }] },
    profile: {
      skills: [
        { name: 'JavaScript', verified: true },
        { name: 'React', verified: true },
        { name: 'SQL', verified: true },
      ],
      projects: [{ title: 'a' }, { title: 'b' }],
    },
    roleMatch: { role: { label: 'Frontend Developer', codingTarget: 60 }, missing: [] },
  });

  const byId = Object.fromEntries(
    advanced.weeks.flatMap((week) => week.tasks).map((task) => [task.id, task]),
  );

  assert.equal(byId['verify-three'].done, true, 'three verified skills');
  assert.equal(byId['first-hard'].done, true, 'a hard problem was solved');
  assert.equal(byId['two-projects'].done, true);
  assert.equal(byId['ats-70'].done, true, 'ATS 84 clears the 70 bar');
  assert.equal(byId['interview-70'].done, true);
  assert.equal(byId['quantify'].done, true, 'read from the real ATS check');

  assert.ok(advanced.progress.done > 6, 'a strong student should be mostly complete');
});

test('an unverified skill does not count toward verification milestones', () => {
  const { weeks } = buildRoadmap({
    ...base,
    profile: {
      skills: [
        { name: 'JavaScript', verified: false },
        { name: 'React', verified: false },
        { name: 'SQL', verified: false },
      ],
      projects: [],
    },
  });

  const task = weeks.flatMap((w) => w.tasks).find((t) => t.id === 'verify-three');

  assert.equal(task.done, false, 'declaring three skills is not the same as proving them');
  assert.equal(task.progress, '0/3');
});

test('the coding milestone scales to what the student still has left', () => {
  const behind = buildRoadmap({ ...base, roleMatch: { role: { codingTarget: 90 }, missing: [] } });
  const ahead = buildRoadmap({
    ...base,
    coding: { solved: { easy: 40, medium: 30, hard: 5 }, totalSolved: 75 },
    roleMatch: { role: { codingTarget: 90 }, missing: [] },
  });

  const target = (plan) =>
    plan.weeks.flatMap((w) => w.tasks).find((t) => t.id === 'solve-week').label;

  assert.notEqual(
    target(behind),
    target(ahead),
    'a student near the target should not get the same weekly quota as one at zero',
  );
});

test('the missing skill for the target role is named in week one', () => {
  const { weeks } = buildRoadmap({
    ...base,
    roleMatch: {
      role: { label: 'Frontend Developer', codingTarget: 60 },
      missing: ['TypeScript', 'Testing'],
    },
  });

  const task = weeks[0].tasks.find((item) => item.id === 'verify-first');

  assert.match(task.label, /TypeScript/, 'the plan should name the specific gap, not "a skill"');
});

test('week completion and overall progress agree with the tasks', () => {
  const plan = buildRoadmap({
    ...base,
    profile: { skills: [{ name: 'JavaScript', verified: true }], projects: [] },
  });

  for (const week of plan.weeks) {
    assert.equal(week.done, week.tasks.filter((task) => task.done).length);
    assert.equal(week.complete, week.tasks.every((task) => task.done));
  }

  const all = plan.weeks.flatMap((week) => week.tasks);
  assert.equal(plan.progress.total, all.length);
  assert.equal(plan.progress.done, all.filter((task) => task.done).length);
});
