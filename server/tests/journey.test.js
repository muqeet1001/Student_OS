import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { ActionItem, InstitutionConfig, MentorAppointment, StudentJourney } from '../src/models/StudentJourney.js';
import { actionSchema, institutionSchema, onboardingSchema } from '../src/validators/journey.validators.js';

const id = () => new mongoose.Types.ObjectId();

test('a new journey starts incomplete with safe in-app reminders only', () => {
  const journey = new StudentJourney({ user: id() });
  assert.equal(journey.onboarding.completedAt, null);
  assert.equal(journey.channels.inApp, true);
  assert.equal(journey.channels.email, false);
  assert.equal(journey.channels.whatsapp, false);
});

test('onboarding captures a real placement target and bounded weekly goal', () => {
  const result = onboardingSchema.safeParse({
    targetRole: 'software-engineer',
    graduationYear: 2027,
    branch: 'CSE',
    placementDate: '2027-01-15',
    weeklyGoal: 6,
    targetCompanies: ['Acme'],
    consents: [{ key: 'data-sharing', granted: true }],
  });
  assert.equal(result.success, true);
  assert.ok(result.data.placementDate instanceof Date);
});

test('onboarding rejects an unrealistic weekly commitment', () => {
  const result = onboardingSchema.safeParse({
    targetRole: 'frontend', graduationYear: 2027, branch: 'IT',
    placementDate: '2027-01-15', weeklyGoal: 100,
  });
  assert.equal(result.success, false);
});

test('institution readiness weights must total exactly one hundred', () => {
  const invalid = institutionSchema.safeParse({
    readinessWeights: { skills: 20, coding: 20, resume: 20, interview: 20, projects: 10 },
  });
  const valid = institutionSchema.safeParse({
    readinessWeights: { skills: 20, coding: 30, resume: 20, interview: 20, projects: 10 },
  });
  assert.equal(invalid.success, false);
  assert.equal(valid.success, true);
});

test('an action supports staff ownership, deadlines, channels and conversation', () => {
  const action = new ActionItem({
    owner: id(), source: 'staff', assignedBy: id(), category: 'application',
    title: 'Tailor the resume', dueAt: new Date(), reminderChannels: ['in-app', 'email'],
    messages: [{ author: id(), body: 'Use the backend project as evidence.' }],
  });
  assert.equal(action.validateSync(), undefined);
  assert.equal(action.messages.length, 1);
});

test('a mentoring request cannot exist without a concrete topic', () => {
  const appointment = new MentorAppointment({ student: id() });
  assert.match(appointment.validateSync().message, /topic/i);
});

test('institution defaults are usable before an administrator configures anything', () => {
  const config = new InstitutionConfig();
  const total = Object.values(config.readinessWeights.toObject()).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 100);
  assert.deepEqual(config.enabledLocales, ['en']);
});

test('action input cannot smuggle an unknown status or server-owned source', () => {
  const result = actionSchema.safeParse({ title: 'Apply now', source: 'system', status: 'done' });
  assert.equal(result.success, true);
  assert.equal('source' in result.data, false);
  assert.equal('status' in result.data, false);
});
