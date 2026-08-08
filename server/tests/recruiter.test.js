import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { Recruiter, FEEDBACK_TAGS } from '../src/models/Recruiter.js';
import {
  recommendFromFeedback,
  relationshipHealth,
  summariseFeedback,
} from '../src/services/recruiterInsights.js';
import { feedbackSchema } from '../src/validators/recruiter.validators.js';

const id = () => new mongoose.Types.ObjectId();
const at = (iso) => new Date(iso);

const NOW = at('2026-06-01T00:00:00Z');

/** A recruiter carrying one feedback entry. */
const said = (name, { rating = 3, gaps = [], strengths = [] } = {}) => ({
  name,
  status: 'active',
  feedback: [{ rating, gaps, strengths }],
});

test('an empty CRM summarises to zeroes rather than dividing by zero', () => {
  const summary = summariseFeedback([]);

  assert.equal(summary.responses, 0);
  assert.equal(summary.rating.average, 0);
  assert.equal(summary.rating.median, 0);
  assert.deepEqual(summary.gaps, []);
  assert.deepEqual(summary.strengths, []);
});

test('gaps rank by how many recruiters named them', () => {
  const summary = summariseFeedback([
    said('Infosys', { gaps: ['communication', 'dsa'] }),
    said('TCS', { gaps: ['communication'] }),
    said('Zoho', { gaps: ['communication', 'dsa'] }),
    said('Wipro', { gaps: ['resume'] }),
  ]);

  assert.equal(summary.gaps[0].key, 'communication');
  assert.equal(summary.gaps[0].recruiters, 3);
  assert.deepEqual(summary.gaps[0].companies, ['Infosys', 'TCS', 'Zoho']);
  assert.equal(summary.gaps[1].key, 'dsa');
  assert.equal(summary.gaps[1].recruiters, 2);
});

/**
 * A company that visits three times a year would otherwise outvote three
 * companies that visit once, and the loudest relationship is not the
 * broadest signal.
 */
test('one company naming a gap repeatedly still counts as one company', () => {
  const summary = summariseFeedback([
    {
      name: 'Infosys',
      feedback: [
        { rating: 2, gaps: ['communication'] },
        { rating: 3, gaps: ['communication'] },
        { rating: 2, gaps: ['communication'] },
      ],
    },
    said('TCS', { gaps: ['communication'] }),
  ]);

  assert.equal(summary.gaps[0].recruiters, 2, 'two companies, not four mentions');
  assert.equal(summary.responses, 4, 'though all four ratings still count');
});

test('a gap named twice in one feedback entry is not double counted', () => {
  const summary = summariseFeedback([
    { name: 'Infosys', feedback: [{ rating: 3, gaps: ['dsa', 'dsa'] }] },
  ]);

  assert.equal(summary.gaps[0].recruiters, 1);
});

test('strengths are ranked the same way as gaps', () => {
  const summary = summariseFeedback([
    said('Infosys', { strengths: ['projects'] }),
    said('TCS', { strengths: ['projects', 'dsa'] }),
  ]);

  assert.equal(summary.strengths[0].key, 'projects');
  assert.equal(summary.strengths[0].recruiters, 2);
});

test('every ranked theme carries its human label, not just the key', () => {
  const summary = summariseFeedback([said('Infosys', { gaps: ['core-cs'] })]);

  assert.equal(summary.gaps[0].label, 'Core CS fundamentals');
});

test('themes with equal counts are ordered by label, so the list is stable', () => {
  const summary = summariseFeedback([said('A', { gaps: ['resume', 'communication', 'dsa'] })]);

  assert.deepEqual(
    summary.gaps.map((gap) => gap.label),
    ['Communication', 'Data structures & algorithms', 'Resume quality'],
  );
});

/**
 * One furious or one delighted recruiter should not define the cohort's
 * reputation — the same reasoning as the salary report's median.
 */
test('the rating median resists a single outlier response', () => {
  const summary = summariseFeedback([
    said('A', { rating: 4 }),
    said('B', { rating: 4 }),
    said('C', { rating: 4 }),
    said('D', { rating: 4 }),
    said('E', { rating: 1 }),
  ]);

  assert.equal(summary.rating.median, 4);
  assert.equal(summary.rating.average, 3.4);
  assert.equal(summary.rating.lowest, 1);
  assert.equal(summary.rating.highest, 4);
});

test('an even number of ratings averages the middle two', () => {
  const summary = summariseFeedback([
    said('A', { rating: 2 }),
    said('B', { rating: 3 }),
    said('C', { rating: 4 }),
    said('D', { rating: 5 }),
  ]);

  assert.equal(summary.rating.median, 3.5);
});

test('a recruiter with no feedback contributes nothing but does not break', () => {
  const summary = summariseFeedback([
    { name: 'Prospect', status: 'prospect' },
    { name: 'Quiet', feedback: [] },
    said('Infosys', { gaps: ['dsa'] }),
  ]);

  assert.equal(summary.responses, 1);
  assert.equal(summary.gaps.length, 1);
});

test('a gap only one recruiter raised is not turned into a training programme', () => {
  const summary = summariseFeedback([
    said('Infosys', { gaps: ['communication'] }),
    said('TCS', { gaps: ['dsa'] }),
  ]);

  assert.deepEqual(
    recommendFromFeedback(summary).map((entry) => entry.id),
    [],
    'one opinion is an anecdote, not a cohort-wide gap',
  );
});

test('a gap several recruiters agree on becomes a recommendation naming them', () => {
  const summary = summariseFeedback([
    said('Infosys', { gaps: ['communication'] }),
    said('TCS', { gaps: ['communication'] }),
    said('Zoho', { gaps: ['communication'] }),
  ]);

  const [recommendation] = recommendFromFeedback(summary);

  assert.equal(recommendation.id, 'recruiter-communication');
  assert.equal(recommendation.affected, 3);
  assert.equal(recommendation.priority, 'high', 'all three responding companies agreed');
  assert.match(recommendation.reason, /Infosys, TCS, Zoho/);
  assert.equal(recommendation.source, 'recruiter-feedback');
});

test('a long list of companies is truncated rather than filling the card', () => {
  const summary = summariseFeedback(
    ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => said(name, { gaps: ['dsa'] })),
  );

  const [recommendation] = recommendFromFeedback(summary);

  assert.match(recommendation.reason, /and 2 more/);
});

test('relationship health reports nothing rather than guessing for a new prospect', () => {
  const health = relationshipHealth({ name: 'New Co', status: 'prospect' }, { now: NOW });

  assert.equal(health.visits, 0);
  assert.equal(health.hired, 0);
  assert.equal(health.conversionRate, 0);
  assert.equal(health.lastVisit, null);
  assert.equal(health.monthsSinceLastVisit, null);
  assert.equal(health.averageCtc, null, 'no offers is not a zero-rupee average');
});

test('a company that has never visited is flagged stale', () => {
  const health = relationshipHealth({ name: 'Old Co', status: 'prospect' }, { now: NOW });

  assert.equal(health.stale, true);
});

test('a recent visit clears the stale flag', () => {
  const health = relationshipHealth(
    { name: 'Infosys', status: 'active' },
    { drives: [{ driveDate: at('2026-03-01T00:00:00Z'), shortlist: [] }], now: NOW },
  );

  assert.equal(health.monthsSinceLastVisit, 3);
  assert.equal(health.stale, false);
});

/**
 * A relationship goes quiet without anyone remembering to change a dropdown,
 * which is exactly when it needs flagging.
 */
test('a long-quiet company is stale even while its stored status says active', () => {
  const health = relationshipHealth(
    { name: 'Gone Quiet', status: 'active' },
    { drives: [{ driveDate: at('2024-01-01T00:00:00Z'), shortlist: [] }], now: NOW },
  );

  assert.ok(health.monthsSinceLastVisit >= 18);
  assert.equal(health.stale, true, 'the stored status is not evidence of contact');
});

test('a company already written off is not nagged about as stale', () => {
  const health = relationshipHealth({ name: 'Lost Co', status: 'lost' }, { now: NOW });

  assert.equal(health.stale, false, 'that is a decision, not neglect');
});

test('the latest drive defines the last visit, whatever order they arrive in', () => {
  const health = relationshipHealth(
    { name: 'Infosys', status: 'active' },
    {
      drives: [
        { driveDate: at('2025-01-01T00:00:00Z'), shortlist: [] },
        { driveDate: at('2026-04-01T00:00:00Z'), shortlist: [] },
        { driveDate: at('2025-08-01T00:00:00Z'), shortlist: [] },
      ],
      now: NOW,
    },
  );

  assert.equal(new Date(health.lastVisit).toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(health.visits, 3);
});

test('a drive with no date still counts as a visit but cannot set the last-visit date', () => {
  const health = relationshipHealth(
    { name: 'Infosys', status: 'active' },
    { drives: [{ shortlist: [] }], now: NOW },
  );

  assert.equal(health.visits, 1);
  assert.equal(health.lastVisit, null);
  assert.equal(health.stale, true, 'an undated drive is not evidence of recent contact');
});

test('hires count distinct students, matching the placement report', () => {
  const student = id();

  const health = relationshipHealth(
    { name: 'Infosys', status: 'active' },
    {
      drives: [{ driveDate: at('2026-04-01T00:00:00Z'), shortlist: [{}, {}, {}, {}] }],
      offers: [
        { student, status: 'accepted', ctc: 800_000 },
        { student, status: 'joined', ctc: 800_000 },
        { student: id(), status: 'declined', ctc: 900_000 },
      ],
      now: NOW,
    },
  );

  assert.equal(health.offers, 3);
  assert.equal(health.hired, 1, 'one student, two offers, one hire');
  assert.equal(health.conversionRate, 25, '1 hire from 4 shortlisted');
});

test('conversion counts every shortlisted student across every visit', () => {
  const health = relationshipHealth(
    { name: 'Infosys', status: 'active' },
    {
      drives: [
        { driveDate: at('2026-01-01T00:00:00Z'), shortlist: [{}, {}] },
        { driveDate: at('2026-04-01T00:00:00Z'), shortlist: [{}, {}] },
      ],
      offers: [
        { student: id(), status: 'joined' },
        { student: id(), status: 'accepted' },
      ],
      now: NOW,
    },
  );

  assert.equal(health.shortlisted, 4);
  assert.equal(health.conversionRate, 50);
});

test('offers with no package reported do not drag the average to zero', () => {
  const health = relationshipHealth(
    { name: 'Infosys', status: 'active' },
    {
      drives: [],
      offers: [
        { student: id(), status: 'accepted', ctc: 600_000 },
        { student: id(), status: 'accepted', ctc: null },
      ],
      now: NOW,
    },
  );

  assert.equal(health.averageCtc, 600_000);
});

test('a recruiter requires a company name', () => {
  assert.ok(new Recruiter({}).validateSync().errors.name);
});

test('feedback requires a rating and rejects one outside 1–5', () => {
  const base = { name: 'Infosys' };

  assert.ok(new Recruiter({ ...base, feedback: [{ gaps: ['dsa'] }] }).validateSync().errors);
  assert.ok(new Recruiter({ ...base, feedback: [{ rating: 6 }] }).validateSync());
  assert.ok(new Recruiter({ ...base, feedback: [{ rating: 0 }] }).validateSync());
  assert.equal(new Recruiter({ ...base, feedback: [{ rating: 5 }] }).validateSync(), undefined);
});

test('feedback rejects a tag outside the shared vocabulary', () => {
  const recruiter = new Recruiter({
    name: 'Infosys',
    feedback: [{ rating: 3, gaps: ['vibes'] }],
  });

  assert.ok(recruiter.validateSync(), 'free-text tags cannot be counted, so they are refused');
});

test('the validator accepts every tag the model defines', () => {
  // Guards the two lists drifting apart, which would reject valid feedback.
  const parsed = feedbackSchema.parse({
    rating: 4,
    gaps: FEEDBACK_TAGS.map((tag) => tag.key),
    strengths: FEEDBACK_TAGS.map((tag) => tag.key),
  });

  assert.equal(parsed.gaps.length, FEEDBACK_TAGS.length);

  const model = new Recruiter({ name: 'Infosys', feedback: [parsed] });
  assert.equal(model.validateSync(), undefined);
});

test('the validator rejects a rating the model would also reject', () => {
  assert.equal(feedbackSchema.safeParse({ rating: 6 }).success, false);
  assert.equal(feedbackSchema.safeParse({ rating: 2.5 }).success, false);
  assert.equal(feedbackSchema.safeParse({}).success, false);
});

test('only one contact stays primary, however many were flagged', async () => {
  const recruiter = new Recruiter({
    name: 'Infosys',
    contacts: [
      { name: 'A', primary: true },
      { name: 'B', primary: true },
      { name: 'C', primary: false },
    ],
  });

  // The pre-save hook is what enforces it, so run the hooks without a database.
  await new Promise((resolve, reject) => {
    recruiter.schema.s.hooks.execPre('save', recruiter, (error) =>
      error ? reject(error) : resolve(),
    );
  });

  assert.equal(recruiter.contacts.filter((contact) => contact.primary).length, 1);
  assert.equal(recruiter.contacts.find((contact) => contact.primary).name, 'B', 'the last wins');
});

test('the primary contact falls back to the first when none is flagged', () => {
  const recruiter = new Recruiter({
    name: 'Infosys',
    contacts: [{ name: 'A' }, { name: 'B' }],
  });

  assert.equal(recruiter.primaryContact.name, 'A');
});

test('a recruiter with no contacts has no primary rather than throwing', () => {
  assert.equal(new Recruiter({ name: 'Infosys' }).primaryContact, null);
});

test('feedback tag keys are unique and every one carries a label', () => {
  const keys = FEEDBACK_TAGS.map((tag) => tag.key);

  assert.equal(new Set(keys).size, keys.length);
  assert.ok(FEEDBACK_TAGS.every((tag) => tag.label && tag.label !== tag.key));
});
