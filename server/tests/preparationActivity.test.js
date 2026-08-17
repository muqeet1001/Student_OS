import assert from 'node:assert/strict';
import test from 'node:test';
import { summarisePreparationActivity } from '../src/services/preparationActivity.js';

const event = (type, day) => ({ type, at: new Date(`${day}T12:00:00.000Z`) });

test('preparation work is grouped by day and activity type', () => {
  const result = summarisePreparationActivity([
    event('coding', '2026-08-14'),
    event('coding', '2026-08-14'),
    event('interviews', '2026-08-14'),
    event('applications', '2026-08-15'),
  ], new Date('2026-08-15T18:00:00.000Z'));

  assert.deepEqual(result.activity[0], {
    date: '2026-08-14',
    count: 3,
    coding: 2,
    assessments: 0,
    interviews: 1,
    applications: 0,
  });
  assert.equal(result.activeDays, 2);
  assert.equal(result.totalContributions, 4);
});

test('current and longest streaks use distinct consecutive active days', () => {
  const result = summarisePreparationActivity([
    event('coding', '2026-08-09'),
    event('coding', '2026-08-10'),
    event('coding', '2026-08-11'),
    event('assessments', '2026-08-14'),
    event('interviews', '2026-08-15'),
  ], new Date('2026-08-16T08:00:00.000Z'));

  assert.equal(result.currentStreak, 2, 'yesterday keeps the current streak alive');
  assert.equal(result.longestStreak, 3);
});

test('a fully missed day ends the current streak without erasing the longest', () => {
  const result = summarisePreparationActivity([
    event('coding', '2026-08-10'),
    event('coding', '2026-08-11'),
  ], new Date('2026-08-14T08:00:00.000Z'));

  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 2);
});

test('no activity produces honest zeroes', () => {
  assert.deepEqual(summarisePreparationActivity([], new Date('2026-08-14T08:00:00.000Z')), {
    activity: [],
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    totalContributions: 0,
  });
});
