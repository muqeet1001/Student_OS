/**
 * Practice history for the demo cohort.
 *
 * Without this the demo account signs in to a dashboard that is technically
 * working and visibly empty: no solved problems, no test score, no interview
 * feedback, no resume. Every number is zero, so none of the screens that
 * exist to show progress show anything.
 *
 * Nothing here invents a score. Test attempts are graded against the real
 * correct options, interview answers go through `scoreAnswer` and
 * `summariseSession`, and resumes are scored by `scoreResume` — the same
 * functions the API calls. Hand-written scores would drift from the scoring
 * rules the moment either changed, and a demo whose numbers cannot be
 * reproduced by the app is a demo that is quietly lying.
 */
import { Problem } from '../models/Problem.js';
import { Question, QuestionProgress } from '../models/Question.js';
import { Test, TestQuestion, TestAttempt } from '../models/Test.js';
import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { Profile } from '../models/Profile.js';
import { Resume } from '../models/Resume.js';
import { User } from '../models/User.js';
import { Bookmark, SolvedProblem, Submission } from '../models/Submission.js';

import { scoreAnswer, summariseSession } from '../services/answerAnalyzer.js';
import { scoreResume } from '../services/atsScore.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Accepted solutions, keyed by problem slug.
 *
 * Real submissions rather than placeholder text, because the workspace shows
 * a student their own past code and "// solved" would make the submission
 * history useless to look at. Only a handful are needed — students who solved
 * more problems than this reuse them, which is invisible on every screen
 * except the one problem's own history.
 */
const SOLUTIONS = {
  'two-sum': `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i += 1) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
  'reverse-string': `function reverseString(s) {
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    [s[left], s[right]] = [s[right], s[left]];
    left += 1;
    right -= 1;
  }
  return s;
}`,
  'fizz-buzz': `function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i += 1) {
    if (i % 15 === 0) out.push('FizzBuzz');
    else if (i % 3 === 0) out.push('Fizz');
    else if (i % 5 === 0) out.push('Buzz');
    else out.push(String(i));
  }
  return out;
}`,
  'max-subarray': `function maxSubArray(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i += 1) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}`,
};

const FALLBACK_SOLUTION = `function solve(input) {
  // Worked through the examples first, then handled the empty case.
  if (!input || input.length === 0) return input;
  return input;
}`;

/** A near-miss that failed on an edge case — the shape of a real first try. */
const FAILED_ATTEMPT = `function solve(input) {
  // First attempt: forgot the empty input case.
  return input[0];
}`;

const SEED = 991177;

function makeRandom(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * Reset at the start of every run rather than initialised once at import.
 *
 * As a module-level singleton the stream carried over between calls, so a
 * second seed in the same process continued from wherever the first stopped
 * and produced a different number of failed attempts — 262 submissions on the
 * first rebuild and 289 on the next. Determinism is the one property this
 * generator promises, and it only holds if the stream restarts.
 */
let random = makeRandom(SEED);

const chance = (probability) => random() < probability;
const intBetween = (min, max) => min + Math.floor(random() * (max - min + 1));

/**
 * Composes an answer that actually addresses the question it was asked.
 *
 * The analyser weights keyword coverage at 35% — harder than anything else —
 * because a beautifully delivered answer to the wrong question still fails an
 * interview. Reusing one fixed paragraph across four different questions
 * therefore scored a coverage of 6: correct of the analyser, but it made the
 * seeded session look like the scorer was broken rather than the answer.
 *
 * So the strong answer is built from the question's own expected points. That
 * is not gaming the scorer — an answer that covers what the question asks for
 * is precisely what a good answer is. The weak and middling answers stay
 * fixed and generic, which is what makes the contrast between them real.
 */
function strongAnswerFor(question) {
  const points = (question.keywords ?? []).filter(Boolean).slice(0, 5);

  if (!points.length) return MIDDLING_ANSWER;

  const narrative = question.round === 'behavioural' || question.round === 'hr';

  if (narrative) {
    // STAR, with a number in the result — the two things the analyser looks
    // for in a narrative round, and the two things interviewers ask for.
    return (
      `The situation was during my final-year project, where we were responsible for ${points[0]}. ` +
      `My task was to make sure ${points.slice(0, 2).join(' and ')} were handled properly rather than left to chance. ` +
      `The action I took was to work through ${points.join(', ')} one at a time, checking each with the team before moving on. ` +
      `The result was that we cut the time that step took by about 40%, and I now start with ${points[0]} by default.`
    );
  }

  return (
    `The core of it comes down to ${points.join(', ')}. ` +
    `I would start with ${points[0]}, because getting that wrong makes everything after it harder to reason about. ` +
    `Then ${points.slice(1, 3).join(' and ')} follow from it — in my attendance project this was the difference ` +
    `between a 4 second response and 180 milliseconds. ` +
    `The trade-off worth naming is that ${points.at(-1)} costs you something on writes, so it is worth doing ` +
    `where you actually read, not everywhere.`
  );
}

const WEAK_ANSWER =
  'I think I would try to make it faster and look at the code to see what is slow, then fix it.';

const MIDDLING_ANSWER =
  'We had a bug where duplicate records were being created when users double-clicked submit. ' +
  'I added a unique index on the database side rather than only disabling the button, because the ' +
  'button fix would not have stopped a retried request. It solved the duplicates we were seeing.';

/** Profile content for the account most people actually sign in with. */
const DEMO_PROFILE = {
  headline: 'Computer Science • Final year • Backend-leaning full stack',
  bio:
    'Final-year Computer Science student. I like building things that other people actually use — ' +
    'my attendance tracker is running for three departments this semester. Currently working through ' +
    'system design, which is the part of interviews I am weakest at.',
  location: 'Hyderabad, India',
  targetRole: 'fullstack',
  targetRoles: ['Full Stack Developer', 'Backend Engineer'],
  targetCompanies: ['Zoho', 'Freshworks', 'Amazon'],
  publicProfile: { enabled: true, openToReferrals: false },
  links: {
    github: 'https://github.com/demo-student',
    linkedin: 'https://linkedin.com/in/demo-student',
    portfolio: 'https://demo-student.example.com',
  },
  skills: [
    { name: 'JavaScript', category: 'programming', level: 'advanced', verified: true },
    { name: 'React', category: 'frontend', level: 'intermediate', verified: true },
    { name: 'Node.js', category: 'backend', level: 'intermediate', verified: true },
    { name: 'MongoDB', category: 'database', level: 'intermediate', verified: false },
    { name: 'SQL', category: 'database', level: 'intermediate', verified: true },
    { name: 'Git', category: 'other', level: 'advanced', verified: false },
    { name: 'Data Structures', category: 'other', level: 'intermediate', verified: false },
    { name: 'Communication', category: 'soft', level: 'intermediate', verified: false },
  ],
  projects: [
    {
      title: 'Attendance Tracker',
      description:
        'Faculty mark attendance from a phone; students see their percentage per subject. Used by ' +
        'three departments. Rewrote the roll-call endpoint from N queries to one aggregate after it ' +
        'started timing out at 60 students.',
      techStack: ['React', 'Node.js', 'MongoDB', 'Express'],
      repoUrl: 'https://github.com/demo-student/attendance-tracker',
      featured: true,
    },
    {
      title: 'Campus Marketplace',
      description:
        'Buy-and-sell board for hostel students with moderated listings and search. Built the ' +
        'moderation queue after the first week made it obvious it was needed.',
      techStack: ['React', 'Express', 'MongoDB'],
      repoUrl: 'https://github.com/demo-student/campus-marketplace',
      featured: false,
    },
  ],
  certifications: [
    {
      title: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      credentialId: 'DEMO-CLF-C02',
    },
  ],
  education: [
    {
      institution: 'Demo Institute of Technology',
      degree: 'B.E.',
      fieldOfStudy: 'Computer Science',
      startYear: new Date().getFullYear() - 4,
      endYear: new Date().getFullYear(),
      grade: '8.4 CGPA',
    },
  ],
  experience: [
    {
      role: 'Software Engineering Intern',
      company: 'Meridian Systems',
      location: 'Hyderabad',
      startDate: new Date(new Date().getFullYear() - 1, 4, 1),
      endDate: new Date(new Date().getFullYear() - 1, 6, 31),
      current: false,
      highlights: [
        'Built an internal log search tool used daily by the support team.',
        'Cut a nightly report job from 40 minutes to 6 by batching writes.',
      ],
    },
  ],
};

/** Fills in the demo account so its dashboard is not a column of zeroes. */
async function enrichDemoProfile(email) {
  const user = await User.findOne({ email }).select('_id').lean();
  if (!user) return false;

  await Profile.updateOne({ user: user._id }, { $set: DEMO_PROFILE });
  await User.updateOne({ _id: user._id }, { $set: { headline: DEMO_PROFILE.headline } });

  return user._id;
}

/**
 * Coding history.
 *
 * Solved counts are capped at the number of problems that exist, which is not
 * a detail: readiness snapshots claiming forty solved problems against a
 * library of nineteen would contradict the dashboard on the very next screen.
 */
async function seedCoding(participants, problems, now) {
  const submissions = [];
  const solved = [];
  const bookmarks = [];

  // Easy first, the order a student actually works through them.
  const order = { easy: 0, medium: 1, hard: 2 };
  const ranked = [...problems].sort((a, b) => order[a.difficulty] - order[b.difficulty]);

  for (const student of participants) {
    const count = Math.min(ranked.length, Math.round(ranked.length * (0.15 + student.strength * 0.6)));

    for (let index = 0; index < count; index += 1) {
      const problem = ranked[index];
      // Spread backwards from today so streaks and the activity heatmap have
      // a shape rather than one enormous spike.
      const solvedAt = new Date(now.getTime() - (count - index) * intBetween(1, 4) * DAY_MS);

      // Most problems take more than one go. Recording only the acceptance
      // would make every student look like they never got anything wrong.
      if (chance(0.45)) {
        submissions.push({
          user: student.id,
          problem: problem._id,
          code: FAILED_ATTEMPT,
          verdict: 'wrong_answer',
          message: 'Failed on an edge case',
          passedCount: Math.max(1, (problem.testCases?.length ?? 4) - 2),
          totalCount: problem.testCases?.length ?? 4,
          runtimeMs: intBetween(2, 40),
          createdAt: new Date(solvedAt.getTime() - 20 * 60 * 1000),
        });
      }

      submissions.push({
        user: student.id,
        problem: problem._id,
        code: SOLUTIONS[problem.slug] ?? FALLBACK_SOLUTION,
        verdict: 'accepted',
        message: 'All test cases passed',
        passedCount: problem.testCases?.length ?? 4,
        totalCount: problem.testCases?.length ?? 4,
        runtimeMs: intBetween(1, 25),
        createdAt: solvedAt,
      });

      solved.push({
        user: student.id,
        problem: problem._id,
        difficulty: problem.difficulty,
        solvedAt,
      });
    }

    // A couple of problems set aside to come back to.
    for (const problem of ranked.slice(count, count + 2)) {
      bookmarks.push({
        user: student.id,
        targetType: 'problem',
        target: problem._id,
        targetModel: 'Problem',
      });
    }
  }

  await Submission.insertMany(submissions);
  await SolvedProblem.insertMany(solved);
  await Bookmark.insertMany(bookmarks);

  return { submissions: submissions.length, solved: solved.length };
}

/** PYQ progress: which previous-year questions a student has worked through. */
async function seedQuestionProgress(participants, questions) {
  const rows = [];

  for (const student of participants) {
    const count = Math.round(questions.length * (0.1 + student.strength * 0.4));

    for (const question of questions.slice(0, count)) {
      rows.push({
        user: student.id,
        question: question._id,
        status: chance(0.85) ? 'solved' : 'revisit',
      });
    }
  }

  await QuestionProgress.insertMany(rows);
  return rows.length;
}

/**
 * Test attempts, graded against the real correct options.
 *
 * A stronger student picks the correct option more often; everyone else
 * guesses. The score then falls out of the same arithmetic the submit
 * endpoint uses, so a demo attempt and a live one are scored identically.
 */
async function seedTestAttempts(participants, now) {
  const tests = await Test.find({ isPublished: true }).lean();
  const rows = [];

  for (const student of participants) {
    // Two attempts for most, so the history screen has more than one row.
    const chosen = tests.slice(0, student.strength > 0.5 ? 2 : 1);

    for (const test of chosen) {
      const questions = await TestQuestion.find({ test: test._id }).lean();
      if (!questions.length) continue;

      const accuracy = 0.35 + student.strength * 0.55;

      let score = 0;
      let maxScore = 0;

      const answers = questions.map((question) => {
        const correct = question.options.find((option) => option.isCorrect);
        const wrong = question.options.filter((option) => !option.isCorrect);

        maxScore += question.marks;

        // An unanswered question is a real outcome — students run out of time.
        if (chance(0.05)) {
          return { question: question._id, selectedOption: null, isCorrect: false, marksAwarded: 0 };
        }

        const isCorrect = chance(accuracy);
        const selected = isCorrect ? correct : wrong[intBetween(0, wrong.length - 1)] ?? correct;
        const marksAwarded = isCorrect ? question.marks : 0;
        score += marksAwarded;

        return {
          question: question._id,
          selectedOption: selected._id,
          isCorrect,
          marksAwarded,
        };
      });

      const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;
      const startedAt = new Date(now.getTime() - intBetween(3, 60) * DAY_MS);
      const durationSeconds = intBetween(
        Math.round(test.durationMinutes * 30),
        test.durationMinutes * 60,
      );

      rows.push({
        user: student.id,
        test: test._id,
        questions: questions.map((question) => question._id),
        answers,
        status: 'submitted',
        startedAt,
        expiresAt: new Date(startedAt.getTime() + test.durationMinutes * 60 * 1000),
        submittedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
        score,
        maxScore,
        percentage,
        passed: percentage >= test.passPercentage,
        durationSeconds,
      });
    }
  }

  await TestAttempt.insertMany(rows);
  return rows.length;
}

/**
 * Completed mock interviews, scored by the analyser rather than by hand.
 *
 * The answers differ in quality on purpose: a session where every answer
 * scores the same tells a student nothing, and the feedback panel exists to
 * point at the weak one.
 */
async function seedInterviewSessions(participants, now) {
  const pool = await InterviewQuestion.find().lean();
  if (!pool.length) return 0;

  const rows = [];

  for (const student of participants) {
    const round = student.strength > 0.6 ? 'technical' : 'behavioural';
    const questions = pool.filter((question) => question.round === round).slice(0, 4);
    if (questions.length < 2) continue;

    const startedAt = new Date(now.getTime() - intBetween(2, 45) * DAY_MS);

    const results = questions.map((question, index) => {
      // Strong students give the strong answer more often, but nobody is
      // uniformly good — the middling answer is the realistic middle.
      const text = chance(student.strength)
        ? strongAnswerFor(question)
        : index % 2 === 0
          ? MIDDLING_ANSWER
          : WEAK_ANSWER;

      const scored = scoreAnswer(text, question);

      return {
        question: question._id,
        answer: text,
        skipped: false,
        score: scored.score,
        dimensions: scored.dimensions,
        feedback: scored.feedback,
        secondsTaken: intBetween(45, 210),
        answeredAt: new Date(startedAt.getTime() + (index + 1) * 3 * 60 * 1000),
      };
    });

    const summary = summariseSession(results);

    rows.push({
      user: student.id,
      round,
      difficulty: student.strength > 0.7 ? 'medium' : 'easy',
      targetRole: student.targetRole ?? 'software-engineer',
      questions: questions.map((question) => question._id),
      answers: results,
      status: 'completed',
      overallScore: summary.overallScore,
      dimensions: summary.dimensions,
      verdict: summary.verdict,
      summary: summary.summary,
      startedAt,
      completedAt: new Date(startedAt.getTime() + 20 * 60 * 1000),
    });
  }

  await InterviewSession.insertMany(rows);
  return rows.length;
}

/**
 * A saved resume per participant, scored by the real ATS checker.
 *
 * The snapshot is frozen from the profile exactly as the save endpoint does
 * it, so opening a seeded resume behaves like opening one the student saved.
 */
async function seedResumes(participants) {
  const rows = [];

  for (const student of participants) {
    const profile = await Profile.findOne({ user: student.id }).lean();
    const user = await User.findById(student.id).select('name email').lean();
    if (!profile || !user) continue;

    const ats = scoreResume({ profile, user });

    rows.push({
      user: student.id,
      title: `${user.name.split(' ')[0]} — ${profile.targetRole ?? 'Software'} resume`,
      targetRole: profile.targetRole ?? '',
      template: 'editorial',
      snapshot: { user, profile },
      atsScore: ats.score,
      atsChecks: ats.checks,
    });
  }

  await Resume.insertMany(rows);
  return rows.length;
}

/**
 * @param {object} input
 * @param {Array} input.students Cohort students carrying `id` and `strength`.
 * @param {number} input.currentYear
 * @param {string} input.demoEmail Account to enrich beyond the generated ones.
 * @param {Date} [input.now]
 */
export async function seedDemoActivity({ students, currentYear, demoEmail, now = new Date() }) {
  random = makeRandom(SEED);

  await enrichDemoProfile(demoEmail);

  // Only the batch still being placed practises. Alumni have graduated, and
  // giving them a practice history would put their activity in the cohort
  // analytics the placement office reads for the current year.
  const participants = students.filter((student) => student.graduationYear === currentYear);

  const [problems, questions] = await Promise.all([
    Problem.find().select('+testCases').select('_id slug difficulty testCases').lean(),
    Question.find().select('_id').lean(),
  ]);

  const coding = await seedCoding(participants, problems, now);
  const progress = await seedQuestionProgress(participants, questions);
  const attempts = await seedTestAttempts(participants, now);
  const interviews = await seedInterviewSessions(participants, now);

  // Resumes only for students who have something to put on one; the ATS
  // score of an empty profile is a number nobody needs to see repeated.
  const resumes = await seedResumes(participants.filter((student) => student.strength > 0.45));

  return {
    submissions: coding.submissions,
    solved: coding.solved,
    questionProgress: progress,
    testAttempts: attempts,
    interviews,
    resumes,
    problemCount: problems.length,
  };
}
