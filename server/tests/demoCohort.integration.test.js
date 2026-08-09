import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';

import { startHarness, stopHarness } from './helpers/integrationHarness.js';

/**
 * The demo cohort written to a real database.
 *
 * These assertions cannot be made in memory. What matters about the demo data
 * is not that each document validates but that the documents agree with each
 * other once the services read them back — a company cannot have hired more
 * students than it shortlisted, and an offer cannot point at a drive that
 * never selected that student. Those are cross-collection facts.
 *
 * The teardown assertions exist because the first version leaked: a calendar
 * entry that referenced neither a student nor a drive survived every rebuild,
 * so re-seeding quietly accumulated duplicate deadlines.
 */
const harness = await startHarness('democohort');
const skip = harness.skipReason ? `skipped — ${harness.skipReason}` : false;

after(() => stopHarness(harness));

describe('demo cohort', { skip }, () => {
  let demo;
  let models;

  test('seeding writes a whole placement office', async () => {
    const { seedDemoCohort } = await import('../src/seed/demo.js');

    models = {
      User: (await import('../src/models/User.js')).User,
      Drive: (await import('../src/models/Drive.js')).Drive,
      Offer: (await import('../src/models/Offer.js')).Offer,
      PlacementEvent: (await import('../src/models/PlacementEvent.js')).PlacementEvent,
      Training: (await import('../src/models/Training.js')).Training,
      Recruiter: (await import('../src/models/Recruiter.js')).Recruiter,
      Announcement: (await import('../src/models/Announcement.js')).Announcement,
      Profile: (await import('../src/models/Profile.js')).Profile,
      ReadinessSnapshot: (await import('../src/models/ReadinessSnapshot.js')).ReadinessSnapshot,
      Submission: (await import('../src/models/Submission.js')).Submission,
      SolvedProblem: (await import('../src/models/Submission.js')).SolvedProblem,
      Bookmark: (await import('../src/models/Submission.js')).Bookmark,
      QuestionProgress: (await import('../src/models/Question.js')).QuestionProgress,
      TestAttempt: (await import('../src/models/Test.js')).TestAttempt,
      InterviewSession: (await import('../src/models/InterviewSession.js')).InterviewSession,
      Resume: (await import('../src/models/Resume.js')).Resume,
    };

    demo = await seedDemoCohort({ fresh: true });

    assert.ok(demo, 'seedDemoCohort returned nothing');
    assert.ok(demo.students > 0);
    assert.ok(demo.offers > 0);
    assert.ok(demo.drives > 0);
    assert.ok(demo.events > 0);
    assert.ok(demo.trainings > 0);
    assert.ok(demo.announcements > 0);
    assert.ok(demo.solved > 0, 'nobody solved anything — every coding screen is empty');
    assert.ok(demo.testAttempts > 0);
    assert.ok(demo.interviews > 0);
    assert.ok(demo.resumes > 0);
  });

  test('nobody solved more problems than exist', async () => {
    const { Problem } = await import('../src/models/Problem.js');
    const problemCount = await Problem.countDocuments();

    const perStudent = await models.SolvedProblem.aggregate([
      { $group: { _id: '$user', solved: { $sum: 1 } } },
      { $sort: { solved: -1 } },
      { $limit: 1 },
    ]);

    assert.ok(perStudent[0].solved <= problemCount, 'solved count exceeds the problem library');

    /*
     * The same ceiling applies to the readiness history. Snapshots used to
     * ramp freely and claimed forty-odd solved problems against a library of
     * nineteen, so the growth chart contradicted the dashboard beside it.
     */
    const highest = await models.ReadinessSnapshot.findOne().sort({ 'totals.solved': -1 }).lean();
    assert.ok(
      highest.totals.solved <= problemCount,
      `a snapshot claims ${highest.totals.solved} solved of ${problemCount} problems`,
    );
  });

  test('every solved problem has an accepted submission behind it', async () => {
    const [solved, accepted] = await Promise.all([
      models.SolvedProblem.find().select('user problem').lean(),
      models.Submission.find({ verdict: 'accepted' }).select('user problem').lean(),
    ]);

    const proof = new Set(accepted.map((row) => `${row.user}::${row.problem}`));

    for (const row of solved) {
      assert.ok(
        proof.has(`${row.user}::${row.problem}`),
        'a problem is marked solved with no accepted submission to show for it',
      );
    }
  });

  test('test attempts are scored by the same arithmetic the submit endpoint uses', async () => {
    const attempts = await models.TestAttempt.find().lean();
    assert.ok(attempts.length > 0);

    for (const attempt of attempts) {
      const score = attempt.answers.reduce((sum, answer) => sum + answer.marksAwarded, 0);
      assert.equal(attempt.score, score, 'stored score disagrees with the answers');
      assert.equal(attempt.percentage, Math.round((score / attempt.maxScore) * 100));

      // A wrong answer must never carry marks, however the seed picked it.
      for (const answer of attempt.answers) {
        if (!answer.isCorrect) assert.equal(answer.marksAwarded, 0);
      }
    }
  });

  test('interview sessions carry the score the analyser actually gives', async () => {
    const { scoreAnswer } = await import('../src/services/answerAnalyzer.js');
    const { InterviewQuestion } = await import('../src/models/InterviewQuestion.js');

    const sessions = await models.InterviewSession.find().limit(5).lean();
    assert.ok(sessions.length > 0);

    for (const session of sessions) {
      for (const answer of session.answers) {
        const question = await InterviewQuestion.findById(answer.question).lean();
        const rescored = scoreAnswer(answer.answer, question);

        // Re-running the scorer over the stored text has to reproduce the
        // stored score, or the demo is showing numbers the app cannot derive.
        assert.equal(rescored.score, answer.score, 'stored answer score is not reproducible');
      }
    }
  });

  test('no company hired more students than it shortlisted', async () => {
    const { relationshipHealth } = await import('../src/services/recruiterInsights.js');

    const [recruiters, drives, offers] = await Promise.all([
      models.Recruiter.find().lean(),
      models.Drive.find().lean(),
      models.Offer.find().lean(),
    ]);

    assert.ok(recruiters.length > 0);

    for (const recruiter of recruiters) {
      const health = relationshipHealth(recruiter, {
        drives: drives.filter((drive) => drive.company === recruiter.name),
        offers: offers.filter((offer) => offer.company === recruiter.name),
      });

      // A conversion rate above 100% is the symptom of offers whose drive was
      // never modelled. It is nonsense on its face, and it is the fastest way
      // to make a reader stop trusting every other number on the page.
      assert.ok(
        health.conversionRate <= 100,
        `${recruiter.name}: hired ${health.hired} of ${health.shortlisted} shortlisted (${health.conversionRate}%)`,
      );
    }
  });

  test('every offer traces back to a drive that selected that student', async () => {
    const [drives, offers] = await Promise.all([
      models.Drive.find().lean(),
      models.Offer.find().lean(),
    ]);

    const selected = new Set();
    for (const drive of drives) {
      for (const entry of drive.shortlist) {
        if (entry.stage === 'selected') selected.add(`${drive._id}::${entry.student}`);
      }
    }

    const linked = offers.filter((offer) => offer.drive);
    assert.ok(linked.length > 0, 'no offer is linked to a drive at all');

    for (const offer of linked) {
      assert.ok(
        selected.has(`${offer.drive}::${offer.student}`),
        `${offer.company} offer points at a drive that never selected this student`,
      );
    }
  });

  test('no calendar event ends before it starts', async () => {
    for (const event of await models.PlacementEvent.find().lean()) {
      assert.ok(new Date(event.endsAt) >= new Date(event.startsAt), event.title);

      for (const slot of event.slots) {
        assert.ok(new Date(slot.endsAt) > new Date(slot.startsAt), `${event.title} slot`);
      }
    }
  });

  test('the calendar has both history and something still to come', async () => {
    const now = Date.now();
    const events = await models.PlacementEvent.find().lean();

    assert.ok(events.some((event) => new Date(event.startsAt).getTime() < now), 'no past events');
    assert.ok(events.some((event) => new Date(event.startsAt).getTime() > now), 'no upcoming events');
  });

  test('a completed session can be measured and a fresh one refuses to be', async () => {
    const { measureEffectiveness } = await import('../src/services/trainingEffectiveness.js');

    const [sessions, snapshots] = await Promise.all([
      models.Training.find().lean(),
      models.ReadinessSnapshot.find().lean(),
    ]);

    const results = sessions.map((session) => measureEffectiveness({ session, snapshots }));

    assert.ok(
      results.some((result) => result.measurable),
      'nothing is measurable — the effectiveness panel would be empty',
    );
    assert.ok(
      results.some((result) => !result.measurable),
      'everything is measurable — the "window still open" state is never shown',
    );

    // The comparison is the whole point: an attendee gain with nothing to
    // compare it against is the number this service exists to refuse.
    for (const result of results.filter((item) => item.measurable)) {
      assert.ok(result.comparison.measured >= 3, 'comparison group too small to be reported');
      assert.ok(result.caveat.length > 0);
    }
  });

  test('a rebuild leaves the counts unchanged rather than accumulating', async () => {
    const { seedDemoCohort } = await import('../src/seed/demo.js');

    const count = async () =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(models).map(async ([name, Model]) => [name, await Model.countDocuments()]),
        ),
      );

    const before = await count();
    await seedDemoCohort({ fresh: true });
    const after = await count();

    assert.deepEqual(after, before);
  });

  test('teardown removes every trace of the cohort', async () => {
    const { clearDemoCohort, demoCohortExists } = await import('../src/seed/demo.js');

    await clearDemoCohort();

    assert.equal(await demoCohortExists(), false);

    for (const name of [
      'Drive', 'Offer', 'PlacementEvent', 'Training', 'Recruiter', 'Announcement', 'ReadinessSnapshot',
      'Submission', 'SolvedProblem', 'Bookmark', 'QuestionProgress', 'TestAttempt', 'InterviewSession', 'Resume',
    ]) {
      assert.equal(await models[name].countDocuments(), 0, `${name} left rows behind`);
    }
  });
});
