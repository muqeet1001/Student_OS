/**
 * Seeds the reference data every screen reads from: coding problems, the PYQ
 * library, skill tests and the interview question bank. Optionally creates a
 * demo student to sign in with.
 *
 *   npm run seed            # upsert reference data
 *   npm run seed -- --fresh # delete reference data first
 *   npm run seed -- --demo  # also create the demo account
 *
 * Reference collections are upserted by their natural key, so re-running is
 * safe and never duplicates. User-generated data (submissions, attempts,
 * profiles) is never touched unless --fresh is passed.
 */
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { parseJobDescription } from '../services/jobMatch.js';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { logger } from '../utils/logger.js';

import { Problem } from '../models/Problem.js';
import { Question } from '../models/Question.js';
import { Test, TestQuestion } from '../models/Test.js';
import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { Company } from '../models/Company.js';
import { Application, JobPosting } from '../models/JobPosting.js';
import { SkillAssessment, SkillAttempt } from '../models/SkillAssessment.js';
import { ReadinessSnapshot } from '../models/ReadinessSnapshot.js';
import { Drive } from '../models/Drive.js';
import { Offer } from '../models/Offer.js';
import { PlacementEvent } from '../models/PlacementEvent.js';
import { Recruiter } from '../models/Recruiter.js';
import { Training } from '../models/Training.js';
import { StudentDocument } from '../models/Document.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Bookmark, SolvedProblem, Submission } from '../models/Submission.js';
import { QuestionProgress } from '../models/Question.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { Resume } from '../models/Resume.js';

import { problems } from './data/problems.js';
import { pyqs } from './data/pyqs.js';
import { tests } from './data/tests.js';
import { interviewQuestions } from './data/interviewQuestions.js';
import { companies } from './data/companies.js';
import { jobs } from './data/jobs.js';
import { skillAssessments } from './data/skillAssessments.js';

const flags = new Set(process.argv.slice(2));
const FRESH = flags.has('--fresh');
const DEMO = flags.has('--demo');

async function seedProblems() {
  for (const problem of problems) {
    await Problem.findOneAndUpdate({ slug: problem.slug }, problem, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
  logger.info(`Seeded ${problems.length} coding problems`);
}

async function seedPyqs() {
  // Resolve the optional link from a PYQ to its practisable problem.
  const bySlug = new Map(
    (await Problem.find().select('slug').lean()).map((item) => [item.slug, item._id]),
  );

  for (const { problemSlug, ...pyq } of pyqs) {
    const linked = problemSlug ? bySlug.get(problemSlug) ?? null : null;
    if (problemSlug && !linked) {
      logger.warn(`PYQ "${pyq.title}" references unknown problem "${problemSlug}"`);
    }

    await Question.findOneAndUpdate(
      { title: pyq.title, company: pyq.company, year: pyq.year },
      { ...pyq, problem: linked },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`Seeded ${pyqs.length} previous-year questions`);
}

async function seedTests() {
  for (const { questions, ...test } of tests) {
    const saved = await Test.findOneAndUpdate(
      { slug: test.slug },
      { ...test, questionCount: questions.length },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Questions are replaced wholesale: they have no natural key, and an
    // upsert-by-prompt would strand edits to any prompt that changed.
    await TestQuestion.deleteMany({ test: saved._id });
    await TestQuestion.insertMany(questions.map((question) => ({ ...question, test: saved._id })));
  }

  const total = tests.reduce((sum, test) => sum + test.questions.length, 0);
  logger.info(`Seeded ${tests.length} skill tests (${total} questions)`);
}

async function seedInterviewQuestions() {
  for (const question of interviewQuestions) {
    await InterviewQuestion.findOneAndUpdate({ prompt: question.prompt }, question, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
  logger.info(`Seeded ${interviewQuestions.length} interview questions`);
}

async function seedCompanies() {
  for (const company of companies) {
    await Company.findOneAndUpdate({ slug: company.slug }, company, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
  logger.info(`Seeded ${companies.length} company prep hubs`);
}

/**
 * Creates every declared index.
 *
 * Mongoose's autoIndex is disabled in production — you do not want each boot
 * rebuilding indexes — so without this step a production database would have
 * none. That is not only a performance problem: the unique indexes are what
 * stop duplicate accounts and stop a re-solve inflating a student's count.
 */
async function seedJobs() {
  for (const { daysUntilDeadline, ...job } of jobs) {
    await JobPosting.findOneAndUpdate(
      { title: job.title, company: job.company },
      {
        ...job,
        // Deadlines are relative so seeded jobs are never already closed.
        deadline: new Date(Date.now() + daysUntilDeadline * 24 * 60 * 60 * 1000),
        requirements: parseJobDescription(job.description),
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`Seeded ${jobs.length} job postings`);
}

async function seedSkillAssessments() {
  for (const assessment of skillAssessments) {
    // Replaced wholesale rather than merged: questions have no natural key,
    // so an upsert would strand edits to any prompt that changed.
    await SkillAssessment.findOneAndUpdate({ skill: assessment.skill }, assessment, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  const total = skillAssessments.reduce((sum, item) => sum + item.questions.length, 0);
  logger.info(`Seeded ${skillAssessments.length} skill assessments (${total} questions)`);
}

async function syncIndexes() {
  const models = [
    User, Profile,
    Problem, Submission, SolvedProblem, Bookmark,
    Question, QuestionProgress,
    Test, TestQuestion, TestAttempt,
    InterviewQuestion, InterviewSession,
    Resume, Company, JobPosting, Application,
    SkillAssessment, SkillAttempt, ReadinessSnapshot, Drive, Offer, PlacementEvent, Recruiter, Training,
    StudentDocument,
  ];

  for (const model of models) {
    await model.syncIndexes();
  }

  logger.info(`Synced indexes across ${models.length} collections`);
}

async function seedDemoUser() {
  const email = 'demo@studentos.com';
  const existing = await User.findOne({ email });

  if (existing) {
    logger.info(`Demo account already exists (${email})`);
    return;
  }

  // Goes through the model so the password is hashed by the same hook the
  // real registration path uses.
  const user = await User.create({
    name: 'Demo Student',
    email,
    password: 'demo1234',
    role: 'student',
  });

  await Profile.create({
    user: user._id,
    headline: 'Computer Science • Final year',
    bio: 'Demo account seeded for local development. Edit or delete freely.',
    branch: 'Computer Science',
    graduationYear: new Date().getFullYear() + 1,
    track: 'technical',
  });

  logger.info(`Created demo account — ${email} / demo1234`);
}

/**
 * @param {object} [options]
 * @param {boolean} [options.connect=true] Set false when the caller already
 *   holds a connection — the integration tests seed into their own database.
 */
export async function run({ connect = true } = {}) {
  if (connect) await connectDatabase();

  if (FRESH) {
    await Promise.all([
      Problem.deleteMany({}),
      Question.deleteMany({}),
      Test.deleteMany({}),
      TestQuestion.deleteMany({}),
      InterviewQuestion.deleteMany({}),
      Company.deleteMany({}),
      JobPosting.deleteMany({}),
      SkillAssessment.deleteMany({}),
    ]);
    logger.warn('Cleared existing reference data (--fresh)');
  }

  // Problems first: the PYQ seed links to them by slug.
  await seedProblems();
  await seedPyqs();
  await seedTests();
  await seedInterviewQuestions();
  await seedCompanies();
  await seedJobs();
  await seedSkillAssessments();
  await syncIndexes();
  if (DEMO) await seedDemoUser();

  if (connect) await disconnectDatabase();
  logger.success('Seeding complete');
}

// Only self-executes when invoked directly (`npm run seed`), so tests can
// import this module to verify its wiring without opening a connection.
/*
 * Compared as fully resolved URLs, not by filename.
 *
 * The previous check compared basenames, which meant this module considered
 * itself "invoked directly" for ANY entry point named index.js — including
 * `npm start`, whose entry is src/index.js. The seeder is not currently in
 * the server's import graph so it never fired, but the moment anything at
 * runtime imported this file, every server boot would have re-seeded the
 * database and then closed the connection out from under itself.
 */
function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  run().catch(async (error) => {
    logger.error('Seeding failed:', error.message);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
}
