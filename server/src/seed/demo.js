/**
 * Generates a demo placement office: a cohort of students plus the drives,
 * offers, events, trainings, recruiter records and announcements that make
 * every admin screen show something real.
 *
 * WHY THIS IS BEHIND --demo
 * -------------------------
 * The reference seed (problems, tests, prep hubs, job postings) is content:
 * it is the same for every college and belongs in any database. Everything in
 * this file is the opposite — it is one college's operational record. Placing
 * invented offers and placement rates in a production database is worse than
 * an empty screen, because an empty screen is obviously empty while "68%
 * placed" reads as fact. So this only ever runs when someone explicitly asks
 * for a demo:
 *
 *   npm run seed -- --demo
 *
 * WHY IT IS DETERMINISTIC
 * -----------------------
 * The generator uses a fixed-seed PRNG, so the same cohort comes out every
 * time. A demo that reshuffles on each run makes bug reports unreproducible
 * and screenshots inconsistent, and it makes it impossible to tell a data
 * change from a rendering change.
 *
 * WHY THE EMAILS ARE .invalid
 * ---------------------------
 * The announcement feature really sends email when SMTP is configured. Demo
 * students therefore live on `@students.demo.invalid` — a TLD reserved by RFC
 * 2606 that can never resolve — so a demo broadcast cannot reach a real
 * person's inbox even if someone points this at a live mail server.
 */
import bcrypt from 'bcryptjs';

import { logger } from '../utils/logger.js';
import { seedDemoActivity } from './demoActivity.js';
import { parseJobDescription } from '../services/jobMatch.js';

import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Drive } from '../models/Drive.js';
import { Offer } from '../models/Offer.js';
import { PlacementEvent } from '../models/PlacementEvent.js';
import { Recruiter } from '../models/Recruiter.js';
import { Training } from '../models/Training.js';
import { Announcement } from '../models/Announcement.js';
import { ReadinessSnapshot } from '../models/ReadinessSnapshot.js';
import { Bookmark, SolvedProblem, Submission } from '../models/Submission.js';
import { QuestionProgress } from '../models/Question.js';
import { TestAttempt } from '../models/Test.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { Resume } from '../models/Resume.js';
import { Problem } from '../models/Problem.js';

import {
  BRANCHES,
  DEMO_RECRUITERS,
  FIRST_NAMES,
  LAST_NAMES,
  PROJECT_IDEAS,
  SKILL_PROFILES,
} from './data/demoPeople.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEMO_EMAIL_DOMAIN = 'students.demo.invalid';
export const DEMO_PASSWORD = 'demo1234';

/**
 * Accounts created elsewhere that should nonetheless take part in the demo.
 *
 * `demo@studentos.com` is the account almost everyone signs in with, and it
 * is created by the reference seed rather than generated here. Left out, it
 * would sit in the current batch with an empty inbox, no interview slot and
 * no training history — every screen the cohort exists to fill would be blank
 * for the one user actually looking at them.
 *
 * Kept to a fixed list rather than "anyone graduating this year", because the
 * teardown has to delete these students' demo rows and must never guess that
 * a real account belongs to it.
 */
const ADOPTED_EMAILS = ['demo@studentos.com'];

/** Students per graduating batch. Enough for group means to mean something. */
const BATCH_SIZE = 18;

/**
 * mulberry32 — small, fast and, unlike Math.random, seedable.
 *
 * Determinism matters more than statistical quality here: nothing in this
 * file is cryptographic, and every consumer of these numbers is a demo
 * screen.
 */
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

const pick = (random, list) => list[Math.floor(random() * list.length)];
const intBetween = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const chance = (random, probability) => random() < probability;

/** Branch chosen against the intake weights rather than uniformly. */
function pickBranch(random) {
  const total = BRANCHES.reduce((sum, branch) => sum + branch.weight, 0);
  let roll = random() * total;

  for (const branch of BRANCHES) {
    roll -= branch.weight;
    if (roll <= 0) return branch;
  }

  return BRANCHES.at(-1);
}

const midnight = (date) => {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

const at = (date, hour, minute = 0) => {
  const copy = new Date(date);
  copy.setUTCHours(hour, minute, 0, 0);
  return copy;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/* ------------------------------------------------------------------ people */

/**
 * Builds the cohort in memory. No database work here, so the shape of a demo
 * student can be unit-tested without a connection.
 */
export function buildCohort({ now = new Date(), seed = 20260101 } = {}) {
  const random = makeRandom(seed);
  const currentYear = now.getFullYear();

  // Three finished batches plus the one still being placed. Three is the
  // minimum that makes a year-on-year trend a trend rather than a pair.
  const batches = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

  const students = [];
  const usedEmails = new Set();

  for (const graduationYear of batches) {
    for (let index = 0; index < BATCH_SIZE; index += 1) {
      const first = pick(random, FIRST_NAMES);
      const last = pick(random, LAST_NAMES);
      const branch = pickBranch(random);
      const bundle = pick(random, SKILL_PROFILES);

      // Roll numbers keep the addresses unique without appending a counter
      // that would look like a deduplication accident.
      const roll = `${graduationYear}${String(index + 1).padStart(3, '0')}`;
      const email = `${first}.${last}.${roll}@${DEMO_EMAIL_DOMAIN}`.toLowerCase();
      if (usedEmails.has(email)) continue;
      usedEmails.add(email);

      // Strength drives everything downstream — how many skills are verified,
      // how likely an offer is, how fast readiness climbs — so a demo cohort
      // has genuine spread instead of everyone sitting at the mean.
      const strength = clamp(random() * 0.7 + random() * 0.5, 0, 1);
      const skillCount = 3 + Math.round(strength * (bundle.skills.length - 3));

      const skills = bundle.skills.slice(0, skillCount).map((skill, position) => ({
        ...skill,
        level: strength > 0.75 && position < 2 ? 'advanced' : strength > 0.4 ? 'intermediate' : 'beginner',
        // Verified means a passing skill-test attempt backed it. Strong
        // students have more of them, but never all — nobody tests everything.
        verified: chance(random, strength * 0.7),
      }));

      const ideas = PROJECT_IDEAS[bundle.label] ?? [];
      const projectCount = strength > 0.6 ? 2 : strength > 0.3 ? 1 : 0;

      students.push({
        name: `${first} ${last}`,
        email,
        roll,
        graduationYear,
        branch: branch.name,
        track: branch.track,
        targetRole: bundle.targetRole,
        bundle: bundle.label,
        strength,
        skills,
        projects: ideas.slice(0, projectCount).map((idea, position) => ({
          ...idea,
          featured: position === 0,
        })),
      });
    }
  }

  return { students, batches, currentYear };
}

/* ------------------------------------------------------------------- drives */

/**
 * Drive descriptions are written as prose for the same reason the job seed is:
 * `parseJobDescription` runs over them, and feeding it pre-structured text
 * would exercise nothing.
 */
function driveTemplates(currentYear) {
  return [
    {
      company: 'Infosys',
      role: 'Systems Engineer',
      package: '₹4.5 LPA',
      location: 'Bengaluru',
      status: 'closed',
      daysFromNow: -95,
      minReadiness: 40,
      description: `Systems Engineer — campus hiring for the ${currentYear} batch.

Required: any programming language, an understanding of DBMS and operating systems, and clear communication. Aptitude is screened first.
Preferred: SQL, and any project you can explain end to end.

Open to CSE, IT and ECE. Minimum CGPA 6.0.`,
    },
    {
      company: 'TCS',
      role: 'Digital Engineer',
      package: '₹7 LPA',
      location: 'Chennai',
      status: 'closed',
      daysFromNow: -78,
      minReadiness: 55,
      description: `TCS Digital — the higher band, gated on the NQT score.

Must have: strong data structures, Java or Python, and SQL. Expect a coding round with two problems.
Good to have: any cloud exposure.

CSE and IT only. CGPA 7.0 and above.`,
    },
    {
      company: 'Zoho',
      role: 'Member Technical Staff',
      package: '₹7.5 LPA',
      location: 'Chennai',
      status: 'closed',
      daysFromNow: -52,
      minReadiness: 60,
      description: `Member Technical Staff.

Zoho runs multiple programming rounds rather than an aptitude test. Required: C or C++ or Java, data structures, and problem solving. You will write code on paper in one round.
Preferred: Linux familiarity.

All branches. CGPA 6.5 minimum.`,
    },
    {
      company: 'Freshworks',
      role: 'Software Engineer',
      package: '₹12 LPA',
      location: 'Chennai',
      status: 'in-progress',
      daysFromNow: -9,
      minReadiness: 65,
      description: `Software Engineer — product team.

Required: JavaScript, React, Node.js and SQL. We look for people who have shipped something and can say what they would change about it.
Preferred: Docker, and automated testing.

CSE and IT graduating in ${currentYear}. CGPA 7.5 and above.`,
    },
    {
      company: 'Amazon',
      role: 'SDE-1',
      package: '₹18 LPA',
      location: 'Hyderabad',
      status: 'open',
      daysFromNow: 12,
      minReadiness: 75,
      description: `SDE-1 — full-time.

Required: strong data structures and algorithms, one of Java, C++ or Python, and system design basics. Two coding rounds and a bar raiser.
Preferred: prior internship experience.

CSE and IT graduating in ${currentYear}. CGPA 7.0 minimum.`,
    },
    {
      company: 'Wipro',
      role: 'Project Engineer',
      package: '₹4 LPA',
      location: 'Pune',
      status: 'open',
      daysFromNow: 21,
      minReadiness: 30,
      description: `Project Engineer — National Talent Hunt.

Required: any programming language, aptitude, and written communication. The communication section is scored.
Preferred: SQL.

All branches. CGPA 6.0 and above.`,
    },
    {
      company: 'Meridian Systems',
      role: 'DevOps Engineer',
      package: '₹6 LPA',
      location: 'Hyderabad',
      status: 'planned',
      daysFromNow: 38,
      minReadiness: 50,
      description: `DevOps Engineer.

Looking for: Linux, Git, Python or Bash, and an understanding of computer networks.
Bonus: Docker, Kubernetes, AWS.

CSE, IT and ECE. Minimum CGPA 6.5.`,
    },
  ];
}

/* ----------------------------------------------------------------- writing */

async function insertStudents(cohort) {
  // Hashed once and shared. bcrypt at cost 12 takes roughly a quarter second
  // per call — running it seventy-odd times would add half a minute to every
  // seed for no benefit, since every demo account has the same password
  // anyway. Hashing at all (rather than storing the plaintext) keeps the demo
  // rows shaped exactly like real ones.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = await User.insertMany(
    cohort.students.map((student) => ({
      name: student.name,
      email: student.email,
      password: passwordHash,
      role: 'student',
      headline: `${student.branch} • Batch of ${student.graduationYear}`,
    })),
  );

  const idByEmail = new Map(users.map((user) => [user.email, user._id]));

  await Profile.insertMany(
    cohort.students.map((student) => ({
      user: idByEmail.get(student.email),
      headline: `${student.branch} • Batch of ${student.graduationYear}`,
      bio: `Final-year ${student.branch} student focused on ${student.targetRole.replace('-', ' ')} roles.`,
      location: 'Campus',
      branch: student.branch,
      graduationYear: student.graduationYear,
      track: student.track,
      targetRole: student.targetRole,
      skills: student.skills,
      projects: student.projects,
      education: [
        {
          institution: 'Demo Institute of Technology',
          degree: 'B.E.',
          fieldOfStudy: student.branch,
          startYear: student.graduationYear - 4,
          endYear: student.graduationYear,
        },
      ],
      links: { github: `https://github.com/demo-${student.roll}` },
    })),
  );

  for (const student of cohort.students) {
    student.id = idByEmail.get(student.email);
  }

  return users.length;
}

/**
 * Folds the pre-existing demo accounts into the current batch.
 *
 * Runs after the generated students are written, so these are appended rather
 * than inserted — they already exist. From here on they are indistinguishable
 * from generated students, which is the point: they get shortlisted, given
 * slots, invited to training and sent announcements like everyone else.
 */
async function adoptExistingStudents(cohort) {
  const users = await User.find({ email: { $in: ADOPTED_EMAILS }, role: 'student' })
    .select('_id email')
    .lean();

  for (const user of users) {
    const profile = await Profile.findOne({ user: user._id }).select('branch graduationYear').lean();

    cohort.students.push({
      name: user.email,
      email: user.email,
      id: user._id,
      graduationYear: profile?.graduationYear ?? cohort.currentYear,
      branch: profile?.branch ?? 'Computer Science',
      track: 'technical',
      targetRole: 'software-engineer',
      bundle: 'web',
      /*
       * Set here rather than adjusted later, because strength is read twice —
       * once when readiness snapshots are generated and again when practice
       * history is. Nudging it between the two would make the history chart
       * disagree with the solved count it is supposed to be charting.
       *
       * Comfortably above average but short of the top: a demo account at
       * either extreme shows only one end of every screen it lands on.
       */
      strength: 0.72,
      skills: [],
      projects: [],
    });
  }

  return users.length;
}

async function insertRecruiters(cohort, now, random) {
  const finalYear = cohort.students.filter((s) => s.graduationYear === cohort.currentYear);
  let count = 0;

  for (const template of DEMO_RECRUITERS) {
    const { contacts = [], notes = '', ...rest } = template;

    // Feedback and interactions only exist for companies that actually came.
    const visited = template.status === 'active' || template.status === 'dormant';

    const feedback = visited
      ? [
          {
            givenAt: new Date(now.getTime() - intBetween(random, 40, 200) * DAY_MS),
            rating: intBetween(random, 3, 5),
            strengths: pick(random, [
              ['programming', 'projects'],
              ['dsa', 'core-cs'],
              ['aptitude', 'professionalism'],
            ]),
            gaps: pick(random, [
              ['communication'],
              ['system-design', 'communication'],
              ['resume'],
              ['dsa'],
            ]),
            notes: 'Recorded after the debrief call.',
          },
        ]
      : [];

    // A second round of feedback for the long-standing relationships, so the
    // CRM has something to trend rather than a single data point.
    if (visited && chance(random, 0.6)) {
      feedback.push({
        givenAt: new Date(now.getTime() - intBetween(random, 300, 500) * DAY_MS),
        rating: intBetween(random, 2, 5),
        strengths: pick(random, [['programming'], ['projects', 'domain'], ['aptitude']]),
        gaps: pick(random, [['communication'], ['dsa'], ['projects']]),
        notes: 'From the previous hiring cycle.',
      });
    }

    const interactions = [
      {
        at: new Date(now.getTime() - intBetween(random, 5, 30) * DAY_MS),
        type: 'email',
        summary: `Shared the ${cohort.currentYear} batch profile — ${finalYear.length} students, branch split attached.`,
      },
      {
        at: new Date(now.getTime() - intBetween(random, 40, 120) * DAY_MS),
        type: pick(random, ['call', 'meeting', 'visit']),
        summary: 'Discussed slot dates and the shortlist criteria for this cycle.',
      },
    ];

    await Recruiter.findOneAndUpdate(
      { name: template.name },
      { ...rest, notes, contacts, feedback, interactions },
      { upsert: true, setDefaultsOnInsert: true, collation: { locale: 'en', strength: 2 } },
    );
    count += 1;
  }

  return count;
}

const RECRUITING_COMPANIES = [
  { company: 'Infosys', role: 'Systems Engineer', ctc: 450000 },
  { company: 'Wipro', role: 'Project Engineer', ctc: 400000 },
  { company: 'Cognizant', role: 'Programmer Analyst', ctc: 440000 },
  { company: 'TCS', role: 'Digital Engineer', ctc: 700000 },
  { company: 'Zoho', role: 'Member Technical Staff', ctc: 750000 },
  { company: 'Freshworks', role: 'Software Engineer', ctc: 1200000 },
  { company: 'Amazon', role: 'SDE-1', ctc: 1800000 },
];

/**
 * Share of each batch that ends up *placed* — holding an accepted or joined
 * offer — keyed by how many years ago it graduated.
 *
 * Set explicitly rather than emerging from a probability, because the alumni
 * page exists to show a year-on-year trend and a trend built from coin flips
 * is whatever the seed happened to roll. The generator places exactly this
 * share, so the number on the page is the number written here.
 *
 * This counts placements, not offers. An earlier version treated it as an
 * offer rate and then let declines eat into it, so a batch labelled 61%
 * rendered as 44% — the kind of quiet discrepancy that makes someone distrust
 * the whole screen. Offers that were declined or are still pending are added
 * on top, below.
 *
 * The current batch is deliberately lowest: its season is only half over,
 * which is the state the "still being placed" banner exists to explain.
 */
const RATE_BY_OFFSET = { 3: 0.5, 2: 0.61, 1: 0.72, 0: 0.44 };

/**
 * Decides who gets an offer, from where, and on what terms.
 *
 * Runs before any drive is written because the drives have to explain the
 * offers rather than the other way round. A company that hired twelve
 * students must have shortlisted at least twelve, or the recruiter page shows
 * a conversion rate above 100% — which is how a dashboard loses its reader.
 */
function planOffers(cohort, random) {
  // Only companies whose drive has already happened can have made an offer to
  // the current batch. An offer from a drive that is still three weeks away
  // is the kind of detail that quietly makes a demo indefensible.
  const CONCLUDED_THIS_SEASON = ['Infosys', 'TCS', 'Zoho', 'Freshworks'];

  const byYear = new Map();
  for (const student of cohort.students) {
    byYear.set(student.graduationYear, [...(byYear.get(student.graduationYear) ?? []), student]);
  }

  const offers = [];

  for (const [graduationYear, batch] of byYear) {
    const offset = cohort.currentYear - graduationYear;
    const rate = RATE_BY_OFFSET[offset] ?? 0.6;

    // Strength decides who is placed, but not rigidly — a little noise means
    // the ranking is not a perfect sort, which is closer to how a season
    // actually goes.
    const ranked = [...batch]
      .map((student) => ({ student, rank: student.strength + random() * 0.35 }))
      .sort((a, b) => b.rank - a.rank)
      .map((entry) => entry.student);

    const pool = offset === 0
      ? RECRUITING_COMPANIES.filter((item) => CONCLUDED_THIS_SEASON.includes(item.company))
      : RECRUITING_COMPANIES;

    const makeOffer = (student, status) => {
      // Strong students reach further up a list ordered by package, so the
      // median moves between batches instead of being uniform noise.
      const ceiling = Math.min(pool.length - 1, 1 + Math.round(student.strength * (pool.length - 2)));
      const choice = pool[intBetween(random, 0, ceiling)];

      const offeredAt = new Date(
        Date.now() - (offset * 365 + intBetween(random, 30, 260)) * DAY_MS,
      );

      return {
        student: student.id,
        graduationYear,
        company: choice.company,
        role: choice.role,
        // ±8% so the median and the average are not the same number.
        ctc: Math.round((choice.ctc * (0.92 + random() * 0.16)) / 1000) * 1000,
        location: pick(random, ['Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai']),
        status,
        offeredAt,
        joiningDate: status === 'joined' ? new Date(offeredAt.getTime() + 120 * DAY_MS) : undefined,
      };
    };

    const placedCount = Math.round(rate * batch.length);
    const placed = ranked.slice(0, placedCount);

    for (const student of placed) {
      // A finished batch has mostly joined; the current one has accepted but
      // not yet started, since nobody joins before they graduate.
      offers.push(makeOffer(student, offset === 0 ? 'accepted' : pick(random, ['joined', 'joined', 'accepted'])));
    }

    /*
     * Offers that did not become placements. Without these the report reads
     * as though every offer is accepted, and the status breakdown — which
     * exists precisely to show that they are not — has one bar.
     *
     * For the current batch these are live `offered` rows: students still
     * deciding, which is the honest mid-season picture. For finished batches
     * they are declines, from students who went for higher studies.
     */
    const undecided = ranked.slice(placedCount, placedCount + Math.round(batch.length * 0.18));
    for (const student of undecided) {
      offers.push(makeOffer(student, offset === 0 ? 'offered' : 'declined'));
    }

    // A few of the strongest held a second offer and turned it down. This is
    // what makes "offers" and "students placed" different numbers rather than
    // two names for one count.
    for (const student of placed.slice(0, Math.max(1, Math.round(placedCount * 0.2)))) {
      if (chance(random, 0.5)) offers.push(makeOffer(student, 'declined'));
    }
  }

  return offers;
}

/**
 * The drives that produced those offers.
 *
 * This season's drives come from the templates and span the whole lifecycle,
 * from planned to closed. Past seasons get one synthesised drive per company
 * that hired, with a shortlist that contains everyone it took plus everyone
 * it turned down — so every derived ratio stays inside its bounds.
 */
async function insertDrives(cohort, plannedOffers, now, random) {
  const byYear = new Map();
  for (const student of cohort.students) {
    byYear.set(student.graduationYear, [...(byYear.get(student.graduationYear) ?? []), student]);
  }

  const finalYear = byYear.get(cohort.currentYear) ?? [];
  const hiredBy = (company, graduationYear) =>
    plannedOffers.filter((offer) => offer.company === company && offer.graduationYear === graduationYear);

  const current = [];

  for (const template of driveTemplates(cohort.currentYear)) {
    const { daysFromNow, ...drive } = template;
    const concluded = template.status === 'closed' || template.status === 'in-progress';

    // Everyone this company made an offer to must appear on its shortlist.
    const selected = new Set(
      concluded ? hiredBy(drive.company, cohort.currentYear).map((offer) => String(offer.student)) : [],
    );

    const alsoShortlisted = finalYear
      .filter((student) => !selected.has(String(student.id)))
      .filter((student) => chance(random, 0.2 + student.strength * 0.45))
      .slice(0, intBetween(random, 4, 8));

    const shortlist = [
      ...finalYear.filter((student) => selected.has(String(student.id))),
      ...alsoShortlisted,
    ].map((student) => {
      const wasSelected = selected.has(String(student.id));

      const stage = wasSelected
        ? 'selected'
        : template.status === 'planned'
          ? 'shortlisted'
          : template.status === 'open'
            ? pick(random, ['shortlisted', 'shortlisted', 'assessment'])
            : template.status === 'in-progress'
              ? pick(random, ['assessment', 'interview', 'interview'])
              : 'rejected';

      return {
        student: student.id,
        matchAtShortlist: Math.round(45 + student.strength * 50),
        stage,
        addedAt: new Date(now.getTime() + (daysFromNow - 7) * DAY_MS),
      };
    });

    current.push(
      await Drive.create({
        ...drive,
        driveDate: at(new Date(now.getTime() + daysFromNow * DAY_MS), 9, 30),
        requirements: parseJobDescription(drive.description),
        shortlist,
      }),
    );
  }

  // Past seasons. Their descriptions are short because nobody re-reads a
  // three-year-old JD — the record exists so the hires have a visit to hang
  // from, not to be prepared against.
  const past = [];

  for (const [graduationYear, batch] of byYear) {
    const offset = cohort.currentYear - graduationYear;
    if (offset === 0) continue;

    for (const company of RECRUITING_COMPANIES) {
      const hires = hiredBy(company.company, graduationYear);
      if (!hires.length) continue;

      const hiredIds = new Set(hires.map((offer) => String(offer.student)));
      const rejected = batch
        .filter((student) => !hiredIds.has(String(student.id)))
        .filter(() => chance(random, 0.35))
        .slice(0, intBetween(random, 2, 5));

      const driveDate = at(
        new Date(Date.now() - (offset * 365 + intBetween(random, 120, 240)) * DAY_MS),
        9,
        30,
      );

      past.push({
        company: company.company,
        role: company.role,
        description: `${company.role} — campus drive for the batch of ${graduationYear}. Archived record.`,
        requirements: { skills: [], minCgpa: null, graduationYear, branches: [], minExperienceYears: null },
        package: `₹${(company.ctc / 100000).toFixed(1)} LPA`,
        location: 'Campus',
        driveDate,
        status: 'closed',
        shortlist: [
          ...batch
            .filter((student) => hiredIds.has(String(student.id)))
            .map((student) => ({ student: student.id, stage: 'selected', addedAt: driveDate })),
          ...rejected.map((student) => ({ student: student.id, stage: 'rejected', addedAt: driveDate })),
        ],
      });
    }
  }

  const inserted = past.length ? await Drive.insertMany(past) : [];
  return { current, past: inserted };
}

/** Writes the planned offers, linking each to the drive that produced it. */
async function insertOffers(plannedOffers, drives) {
  // Keyed by company and season, so a 2024 hire is never attributed to this
  // year's visit — which is what made conversion rates exceed 100%.
  const driveFor = new Map();
  for (const drive of [...drives.current, ...drives.past]) {
    for (const entry of drive.shortlist) {
      if (entry.stage === 'selected') {
        driveFor.set(`${drive.company}::${entry.student}`, drive._id);
      }
    }
  }

  const rows = plannedOffers.map(({ graduationYear, ...offer }) => ({
    ...offer,
    drive: driveFor.get(`${offer.company}::${offer.student}`) ?? null,
  }));

  await Offer.insertMany(rows);
  return rows.length;
}

/**
 * Calendar entries that hang off no drive and hold no slots.
 *
 * Listed here rather than inline because the teardown has no other way to
 * recognise them: it finds demo data by the students and drives it
 * references, and these reference neither. An earlier version left this event
 * behind on every rebuild, so the calendar grew a duplicate deadline each
 * time someone re-seeded.
 */
const STANDALONE_EVENT_TITLES = ['Resume submission deadline — spring cycle'];

async function insertEvents(cohort, drives, now, random) {
  const finalYear = cohort.students.filter((student) => student.graduationYear === cohort.currentYear);
  const rows = [];

  const slotsFor = (students, day, startHour, past) =>
    students.map((student, index) => {
      const startsAt = new Date(at(day, startHour).getTime() + index * 30 * 60 * 1000);
      return {
        student: student.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        panel: (index % 3) + 1,
        venue: `Panel ${(index % 3) + 1}, Placement Block`,
        status: past
          ? chance(random, 0.85)
            ? 'attended'
            : 'no-show'
          : 'scheduled',
      };
    });

  for (const drive of drives) {
    const shortlisted = drive.shortlist
      .map((entry) => finalYear.find((student) => String(student.id) === String(entry.student)))
      .filter(Boolean);

    const driveDay = new Date(drive.driveDate);
    const past = driveDay.getTime() < now.getTime();

    rows.push({
      title: `${drive.company} — Pre-placement talk`,
      type: 'pre-placement-talk',
      company: drive.company,
      drive: drive._id,
      startsAt: at(new Date(driveDay.getTime() - DAY_MS), 15),
      endsAt: at(new Date(driveDay.getTime() - DAY_MS), 16, 30),
      venue: 'Main Auditorium',
      description: `Company overview, role details and Q&A ahead of the ${drive.role} drive.`,
      audience: 'college',
      status: past ? 'completed' : 'scheduled',
      slots: [],
    });

    rows.push({
      title: `${drive.company} — ${drive.role} interviews`,
      type: 'interview',
      company: drive.company,
      drive: drive._id,
      startsAt: at(driveDay, 9, 30),
      endsAt: at(driveDay, 17),
      venue: 'Placement Block',
      description: `Interview day for shortlisted candidates. Report 30 minutes before your slot.`,
      audience: 'shortlist',
      status: past ? 'completed' : drive.status === 'in-progress' ? 'in-progress' : 'scheduled',
      slots: slotsFor(shortlisted, driveDay, 10, past),
    });

    if (drive.status !== 'planned') {
      rows.push({
        title: `${drive.company} — Online assessment`,
        type: 'test',
        company: drive.company,
        drive: drive._id,
        startsAt: at(new Date(driveDay.getTime() - 5 * DAY_MS), 10),
        endsAt: at(new Date(driveDay.getTime() - 5 * DAY_MS), 12),
        venue: 'Computer Centre',
        description: 'Proctored online assessment. Bring your college ID.',
        audience: 'shortlist',
        status: past ? 'completed' : 'scheduled',
        slots: [],
      });
    }
  }

  // A standalone deadline, because the calendar has to cope with an event
  // that belongs to no drive at all.
  rows.push({
    title: STANDALONE_EVENT_TITLES[0],
    type: 'deadline',
    startsAt: at(new Date(now.getTime() + 6 * DAY_MS), 23),
    endsAt: at(new Date(now.getTime() + 6 * DAY_MS), 23, 59),
    venue: 'Online',
    description: 'Upload your final resume to the portal. Late submissions are not shortlisted.',
    audience: 'college',
    status: 'scheduled',
    slots: [],
  });

  await PlacementEvent.insertMany(rows);
  return rows.length;
}

/**
 * Training sessions, and the readiness snapshots that let effectiveness be
 * measured against them.
 *
 * Snapshots are generated with a small, real advantage for attendees on top
 * of a background improvement everybody gets. That is the honest shape of
 * this data: readiness rises anyway, which is exactly why the service refuses
 * to report an attendee gain without a comparison group.
 */
async function insertTrainings(cohort, now, random) {
  const finalYear = cohort.students.filter((student) => student.graduationYear === cohort.currentYear);

  const templates = [
    {
      title: 'DSA Bootcamp — Arrays and Strings',
      type: 'bootcamp',
      targetComponent: 'coding',
      targetSkills: ['Data Structures', 'Problem Solving'],
      trainer: 'Prof. K. Raman',
      provider: 'internal',
      cost: 0,
      daysFromNow: -62,
      hours: 6,
      venue: 'Computer Centre',
      status: 'completed',
      // The measurable one: it happened long enough ago that the 30-day
      // window has closed, so the effectiveness panel has a real result.
      effect: 4.5,
    },
    {
      title: 'Resume Clinic',
      type: 'workshop',
      targetComponent: 'resume',
      targetSkills: [],
      trainer: 'Placement Cell',
      provider: 'internal',
      cost: 0,
      daysFromNow: -48,
      hours: 3,
      venue: 'Seminar Hall 2',
      status: 'completed',
      effect: 6,
    },
    {
      title: 'Mock Interview Drive',
      type: 'mock-drive',
      targetComponent: 'interview',
      targetSkills: ['Communication'],
      trainer: 'Alumni panel',
      provider: 'external',
      cost: 45000,
      daysFromNow: -35,
      hours: 8,
      venue: 'Placement Block',
      status: 'completed',
      effect: 5,
      /*
       * Deliberately zero: attendees improve overall but the interview
       * component stays flat, so the session is taking credit for a gain that
       * came from somewhere else. The effectiveness panel exists to catch
       * exactly this, and a demo where every session passes never shows it
       * working.
       */
      componentEffect: 0,
    },
    {
      title: 'Aptitude Intensive',
      type: 'workshop',
      targetComponent: 'skills',
      targetSkills: ['Aptitude'],
      trainer: 'TalentEdge (external)',
      provider: 'external',
      cost: 120000,
      daysFromNow: -20,
      hours: 5,
      venue: 'Seminar Hall 1',
      status: 'completed',
      // Recent enough that the window is still open — the effectiveness panel
      // should refuse to score this one, which is worth being able to see.
      effect: 2,
    },
    {
      title: 'System Design for Beginners',
      type: 'seminar',
      targetComponent: 'interview',
      targetSkills: ['System Design'],
      trainer: 'Ananya Rao (Alumna, Freshworks)',
      provider: 'external',
      cost: 25000,
      daysFromNow: 9,
      hours: 2,
      venue: 'Main Auditorium',
      status: 'planned',
      effect: 0,
    },
    {
      title: 'Group Discussion Practice',
      type: 'workshop',
      targetComponent: 'interview',
      targetSkills: ['Communication'],
      trainer: 'Placement Cell',
      provider: 'internal',
      cost: 0,
      daysFromNow: 17,
      hours: 3,
      venue: 'Seminar Hall 2',
      status: 'planned',
      effect: 0,
    },
  ];

  const attendedByStudent = new Map();
  const rows = [];

  for (const template of templates) {
    const { daysFromNow, hours, effect, componentEffect = effect, ...training } = template;
    const startsAt = at(new Date(now.getTime() + daysFromNow * DAY_MS), 9);
    const past = template.status === 'completed';

    const attendance = finalYear
      .filter((student) => chance(random, 0.35 + student.strength * 0.4))
      .map((student) => {
        // Registering is not attending. A no-show rate is what makes the
        // attended count differ from the invited count on the admin screen.
        const status = past ? (chance(random, 0.78) ? 'attended' : 'absent') : 'registered';

        if (status === 'attended') {
          attendedByStudent.set(
            String(student.id),
            [
              ...(attendedByStudent.get(String(student.id)) ?? []),
              { startsAt, effect, component: template.targetComponent, componentEffect },
            ],
          );
        }

        return { student: student.id, status, markedAt: past ? startsAt : undefined };
      });

    rows.push({
      ...training,
      startsAt,
      endsAt: new Date(startsAt.getTime() + hours * 60 * 60 * 1000),
      attendance,
    });
  }

  await Training.insertMany(rows);

  const problemCount = await Problem.estimatedDocumentCount();
  const snapshots = buildSnapshots(finalYear, attendedByStudent, now, random, problemCount);
  await ReadinessSnapshot.insertMany(snapshots);

  return { trainings: rows.length, snapshots: snapshots.length };
}

/**
 * Readiness history for the current batch.
 *
 * Written every three days rather than daily: the effectiveness comparison
 * needs a reading on each side of a session, not a continuous series, and a
 * daily series for the whole batch is thousands of rows nobody reads.
 */
function buildSnapshots(students, attendedByStudent, now, random, problemCount) {
  const STEP_DAYS = 3;
  const SPAN_DAYS = 120;
  const rows = [];

  for (const student of students) {
    const attended = attendedByStudent.get(String(student.id)) ?? [];

    // Where the student started, and the background rate everyone improves
    // at simply by using the app.
    let score = 18 + student.strength * 30;
    const drift = 0.35 + student.strength * 0.5;

    const components = {
      skills: score * 0.9,
      coding: score * 0.7,
      resume: score * 0.6,
      interview: score * 0.5,
      projects: score * 0.8,
    };

    for (let offset = SPAN_DAYS; offset >= 0; offset -= STEP_DAYS) {
      const day = midnight(new Date(now.getTime() - offset * DAY_MS));

      // Anything a session earned lands in the period straight after it.
      const active = attended.filter((entry) => {
        const gap = day.getTime() - entry.startsAt.getTime();
        return gap > 0 && gap <= 30 * DAY_MS;
      });

      const perStep = (value) => value / (30 / STEP_DAYS);
      const boost = active.reduce((sum, entry) => sum + perStep(entry.effect), 0);

      score = clamp(score + drift + boost + (random() - 0.45) * 1.5, 0, 100);

      /*
       * The boost is routed into the component the session claimed to move,
       * not spread evenly. That is what makes the effectiveness check able to
       * tell a session that did what it said from one whose attendees
       * improved for unrelated reasons — a distinction the service reports on
       * and which would be invisible if every gain landed everywhere.
       */
      const componentBoost = {};
      for (const entry of active) {
        if (!entry.component) continue;
        componentBoost[entry.component] =
          (componentBoost[entry.component] ?? 0) + perStep(entry.componentEffect);
      }

      for (const key of Object.keys(components)) {
        components[key] = clamp(
          components[key] + drift * 0.9 + (componentBoost[key] ?? 0) + (random() - 0.45) * 2,
          0,
          100,
        );
      }

      rows.push({
        user: student.id,
        day,
        score: Math.round(score),
        components: Object.fromEntries(
          Object.entries(components).map(([key, value]) => [key, Math.round(value)]),
        ),
        totals: {
          /*
           * Capped at the number of problems that exist. Ramping freely
           * produced snapshots claiming forty-odd solved problems against a
           * library of nineteen, so the history chart contradicted the
           * dashboard on the very next screen.
           */
          solved: Math.round(
            ((SPAN_DAYS - offset) / SPAN_DAYS) * problemCount * (0.15 + student.strength * 0.6),
          ),
          verifiedSkills: student.skills.filter((skill) => skill.verified).length,
          interviews: Math.round((SPAN_DAYS - offset) / 30) * (student.strength > 0.5 ? 2 : 1),
          applications: Math.round((SPAN_DAYS - offset) * 0.05),
        },
      });
    }
  }

  return rows;
}

/**
 * Past announcements with their recipient lists frozen, exactly as the send
 * path writes them.
 *
 * `delivery` is `skipped` throughout: no SMTP transport was configured when
 * these were "sent", and recording them as `sent` would be a lie of precisely
 * the kind the Announcement model was designed to prevent.
 */
async function insertAnnouncements(cohort, now, random) {
  const finalYear = cohort.students.filter((student) => student.graduationYear === cohort.currentYear);
  const cse = finalYear.filter((student) => student.branch === 'Computer Science');

  const emailNote = 'Email transport was not configured when this was sent, so nothing was emailed.';

  const templates = [
    {
      subject: 'Amazon SDE-1 drive — registration closes Friday',
      body: 'Registration for the Amazon SDE-1 drive closes at 5pm on Friday. Eligibility is CGPA 7.0 and above, CSE and IT only. Register through the drives page — no email registrations will be accepted.',
      audience: { type: 'all', description: 'All students' },
      recipients: finalYear,
      daysAgo: 3,
    },
    {
      subject: 'Resume clinic — bring a printed copy',
      body: 'The resume clinic runs Saturday from 9am in Seminar Hall 2. Bring a printed copy of your current resume. Reviewers will mark it up by hand; there is no point attending without one.',
      audience: { type: 'year', graduationYear: cohort.currentYear, description: `Batch of ${cohort.currentYear}` },
      recipients: finalYear,
      daysAgo: 12,
    },
    {
      subject: 'CSE: extra DSA practice session added',
      body: 'An additional DSA practice session has been added for Computer Science students on Wednesday evening, covering trees and graphs. Attendance is optional and will not be marked.',
      audience: { type: 'branch', branch: 'Computer Science', description: 'Computer Science' },
      recipients: cse,
      daysAgo: 19,
    },
    {
      subject: 'Freshworks shortlist announced',
      body: 'The shortlist for the Freshworks Software Engineer role is now visible on your drives page. Shortlisted candidates have an interview slot assigned — check the calendar for your panel and time.',
      audience: { type: 'drive', description: 'Freshworks — Software Engineer shortlist' },
      recipients: finalYear.filter((student) => student.strength > 0.55),
      daysAgo: 8,
    },
    {
      subject: 'Placement policy reminder — one offer rule',
      body: 'A reminder that students who accept an offer are withdrawn from further drives, in line with the placement policy. If you are considering declining an offer, speak to the placement cell before the acceptance deadline rather than after it.',
      audience: { type: 'all', description: 'All students' },
      recipients: finalYear,
      daysAgo: 26,
    },
  ];

  const rows = templates.map((template) => ({
    subject: template.subject,
    body: template.body,
    audience: template.audience,
    emailAvailable: false,
    emailNote,
    sentAt: new Date(now.getTime() - template.daysAgo * DAY_MS),
    recipients: template.recipients.map((student) => ({
      student: student.id,
      email: student.email,
      delivery: 'skipped',
      error: '',
      // Read rates are partial, because an inbox screen that shows everything
      // read has nothing left to demonstrate.
      readAt: chance(random, 0.45)
        ? new Date(now.getTime() - (template.daysAgo - 1) * DAY_MS)
        : null,
    })),
  }));

  await Announcement.insertMany(rows);
  return rows.length;
}

/* ------------------------------------------------------------------ runner */

/** True when a previous run already built the cohort. */
export async function demoCohortExists() {
  const existing = await User.findOne({ email: new RegExp(`@${DEMO_EMAIL_DOMAIN}$`) }).select('_id');
  return Boolean(existing);
}

/**
 * Removes everything this module created, and nothing else.
 *
 * Every delete is scoped by a reference back to a demo student, a demo drive
 * or a demo recruiter, so a real drive entered by hand into the same database
 * survives a rebuild. The one exception is the standalone calendar entries,
 * which reference nothing and so have to be matched by title.
 */
export async function clearDemoCohort() {
  const generated = await User.find({ email: new RegExp(`@${DEMO_EMAIL_DOMAIN}$`) }).select('_id').lean();

  if (!generated.length) return 0;

  /*
   * The adopted accounts are swept too, or the demo rows attached to them —
   * their offers, snapshots and slots — survive every rebuild and accumulate.
   * Their User document is deliberately left alone: it was created by the
   * reference seed and is not this module's to delete.
   */
  const adopted = await User.find({ email: { $in: ADOPTED_EMAILS } }).select('_id').lean();
  const ids = [...generated, ...adopted].map((user) => user._id);

  const companyNames = DEMO_RECRUITERS.map((item) => item.name);

  // Collected before the drives are deleted: events are linked to a drive by
  // id, and once the drive is gone there is nothing left to match them on.
  const drives = await Drive.find({
    $or: [{ 'shortlist.student': { $in: ids } }, { shortlist: { $size: 0 }, company: { $in: companyNames } }],
  })
    .select('_id')
    .lean();
  const driveIds = drives.map((drive) => drive._id);

  const generatedIds = generated.map((user) => user._id);

  await Promise.all([
    // Scoped to the generated students: an adopted account keeps the profile
    // the reference seed gave it.
    Profile.deleteMany({ user: { $in: generatedIds } }),
    ReadinessSnapshot.deleteMany({ user: { $in: ids } }),
    Offer.deleteMany({ student: { $in: ids } }),
    Drive.deleteMany({ _id: { $in: driveIds } }),
    PlacementEvent.deleteMany({
      $or: [
        { 'slots.student': { $in: ids } },
        { drive: { $in: driveIds } },
        { title: { $in: STANDALONE_EVENT_TITLES } },
      ],
    }),
    Training.deleteMany({ 'attendance.student': { $in: ids } }),
    Announcement.deleteMany({ 'recipients.student': { $in: ids } }),
    // Practice history, which is per-student and so covers the adopted
    // accounts too — otherwise a rebuild doubles the demo student's solved
    // count and every readiness number computed from it.
    Submission.deleteMany({ user: { $in: ids } }),
    SolvedProblem.deleteMany({ user: { $in: ids } }),
    Bookmark.deleteMany({ user: { $in: ids } }),
    QuestionProgress.deleteMany({ user: { $in: ids } }),
    TestAttempt.deleteMany({ user: { $in: ids } }),
    InterviewSession.deleteMany({ user: { $in: ids } }),
    Resume.deleteMany({ user: { $in: ids } }),

    Recruiter.deleteMany({ name: { $in: companyNames } }),
    // Generated accounts only. Deleting the adopted ones here removed
    // demo@studentos.com on every rebuild, so the account the reference seed
    // had just created vanished and nothing was adopted on the next run.
    User.deleteMany({ _id: { $in: generatedIds } }),
  ]);

  return generatedIds.length;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.fresh] Rebuild even if a cohort already exists.
 * @param {Date} [options.now] Injected so tests can pin the calendar.
 */
export async function seedDemoCohort({ fresh = false, now = new Date() } = {}) {
  if (await demoCohortExists()) {
    if (!fresh) {
      logger.info('Demo cohort already exists — pass --fresh to rebuild it');
      return null;
    }

    const removed = await clearDemoCohort();
    logger.warn(`Cleared the previous demo cohort (${removed} students)`);
  }

  const random = makeRandom(778899);
  const cohort = buildCohort({ now });

  const students = await insertStudents(cohort);
  const adopted = await adoptExistingStudents(cohort);
  const recruiters = await insertRecruiters(cohort, now, random);

  // Offers are planned before the drives are written, so each drive's
  // shortlist can be made to contain everyone that company hired.
  const plannedOffers = planOffers(cohort, random);
  const drives = await insertDrives(cohort, plannedOffers, now, random);
  const offers = await insertOffers(plannedOffers, drives);

  // Only this season's drives reach the calendar. Reconstructing three years
  // of interview slots would bury the current week under archived history.
  const events = await insertEvents(cohort, drives.current, now, random);
  const { trainings, snapshots } = await insertTrainings(cohort, now, random);
  const announcements = await insertAnnouncements(cohort, now, random);
  const activity = await seedDemoActivity({
    students: cohort.students,
    currentYear: cohort.currentYear,
    demoEmail: ADOPTED_EMAILS[0],
    now,
  });

  const driveCount = drives.current.length + drives.past.length;

  logger.info(
    `Seeded demo cohort — ${students + adopted} students across ${cohort.batches.length} batches, ` +
      `${recruiters} recruiters, ${driveCount} drives (${drives.current.length} this season), ` +
      `${offers} offers, ${events} calendar events, ${trainings} training sessions, ` +
      `${snapshots} readiness snapshots, ${announcements} announcements`,
  );
  logger.info(
    `Seeded practice history — ${activity.solved} problems solved across ` +
      `${activity.submissions} submissions, ${activity.testAttempts} test attempts, ` +
      `${activity.interviews} mock interviews, ${activity.resumes} resumes, ` +
      `${activity.questionProgress} PYQs worked through`,
  );
  logger.info(`Demo students sign in with any @${DEMO_EMAIL_DOMAIN} address / ${DEMO_PASSWORD}`);

  return { students, recruiters, drives: driveCount, offers, events, trainings, snapshots, announcements, ...activity };
}

export const __testing = { planOffers, makeRandom, RATE_BY_OFFSET, BATCH_SIZE, STANDALONE_EVENT_TITLES };
