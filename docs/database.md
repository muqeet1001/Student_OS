# Database

MongoDB via Mongoose. 36 collections across 26 model files.

## Connecting

Set `MONGO_URI` in `server/.env` (gitignored — never commit a real URI):

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/student_os?retryWrites=true&w=majority
```

Always include the database name (`/student_os`) before the query string.
Without it, Mongo writes to `test` and the seed appears to do nothing.

Atlas also needs your IP allowed under **Network Access**. `0.0.0.0/0` works
for development; scope it to real addresses before anything ships.

## Seeding

```bash
npm run seed --workspace server              # upsert reference data
npm run seed --workspace server -- --demo    # also create demo@studentos.com / demo1234
npm run seed --workspace server -- --fresh   # wipe reference data first
```

Reference collections are upserted by natural key (`slug`, or
title+company+year for PYQs), so re-running never duplicates. Student data —
submissions, attempts, profiles — is never touched unless `--fresh` is passed.

## Collections

### Identity

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Account and credentials | `email` (unique), `password` (hashed, `select:false`), `role` (`student`\|`admin`), `emailVerifiedAt`, `mustChangePassword`, `refreshTokens[]` |
| `profiles` | Everything a resume and opt-in public profile are built from | `user` (unique), `headline`, `bio`, `graduationYear`, `semester` (1–8), `branch`, `skills[]`, `projects[]`, `education[]`, `experience[]`, `certifications[]`, `publicProfile` |
| `studentjourneys` | Onboarding, baseline, locale, delivery channels, integrations and append-only consent history | `user` (unique), `onboarding`, `channels`, `consentHistory[]` |
| `actionitems` | Personal, staff and system actions with ownership and conversation | `owner`, `source`, `category`, `dueAt`, `status`, `messages[]` |
| `mentorappointments` | Student mentoring requests and scheduled sessions | `student`, `mentor`, `topic`, `startsAt`, `status` |
| `institutionconfigs` | College-specific scoring, taxonomy, languages and provider capabilities | `key` (unique), `readinessWeights`, `skillTaxonomy`, `enabledLocales`, `providers` |
| `onetimetokens` | Single-use grants, scoped by `purpose`: the hash, its expiry, and whether it has been spent | `user`, `purpose` (`password-reset`\|`email-verification`), `tokenHash` (unique), `expiresAt`, `usedAt`, `userAgent` |

One profile per user, enforced by a unique index on `profile.user`.

`onetimetokens` stores only a SHA-256 hash of each link, for the same reason
refresh tokens are hashed: a database leak must not hand someone a way into an
account that is part-way through being recovered. A token is claimed with a
single conditional write, which is what makes a link single-use rather than
merely short-lived. An office-issued temporary password retires any reset link
already outstanding for that account, so two live ways in never coexist. Spent
rows are kept rather than deleted, because "this password was set at 02:14 from
a link issued at 01:58" is the question asked after a disputed takeover — and
nothing recoverable is kept with them.

One collection serves both flows, separated by `purpose`, because they need
identical properties — random, hashed, expiring, claimed in one conditional
write — and only differ in what happens afterwards. Two collections would have
meant two copies of the claim logic, and a single-use guarantee is exactly the
kind of thing that goes missing from the second copy. `purpose` is part of every
lookup rather than inferred from context: without it a reset link would also
satisfy a request to prove an email address, which is a different claim about
the account than the one its holder was given.

Retiring one flow's grants leaves the other's untouched, so asking to reset a
password does not silently invalidate a confirmation link that is already in
someone's inbox.

`users.emailVerifiedAt` records when an address was proved reachable, and is
`null` until then — the state every existing row is in. Nothing is gated on it,
deliberately: most installations have no mail relay configured, and the
placement office can issue a password but cannot issue an inbox.

`users.mustChangePassword` is set when the placement office issues a temporary
password and cleared when the student replaces it. While it is set, every route
except the change-password screen is closed. Replacing a password through any
route also clears `users.refreshTokens`, so no session outlives the credential
it was opened with.

`profiles.semester` is captured at onboarding and drives the practice track
(`GET /api/practice/track`): which stage of the placement journey the student
is in, and which subjects to focus on. It is a *recommendation* — it never
hides content.

### Course taxonomy and semesters

The practice hub is organised as courses by `server/src/config/courseTaxonomy.js`,
the single source of truth for:

- **Domains** — `aptitude`, `cs-core`, `communication` — mutually exclusive,
  so a Databases paper can never sit under Aptitude.
- **Subjects** — one per paper, e.g. `quantitative`, `logical`,
  `data-interpretation`, `dsa`, `databases`, `os`, `networks`, `oop`,
  `cs-foundations`, `verbal`, `communication`, each mapped from a test slug in
  `TEST_COURSES`. No database migration is needed because the mapping lives in
  code and `/api/tests` enriches each paper with `subject` and `level`.
- **Levels** — `foundation` / `intermediate` / `advanced`, each with the
  semester band and coding-problem difficulties it corresponds to. The band is
  not documentation: `levelForSemester` resolves a semester to the *highest*
  band covering it (the bands overlap at 3 and across 5–6 on purpose, and a
  student inside an overlap is aimed at the level they are moving into), and
  that is what every stage's focus levels are derived from.
- **Semester stages** — semesters 1–2 *Foundations*, 3–4 *Core building*,
  5–6 *Interview gear*, 7–8 *Placement mode*, each listing focus subjects and
  target levels. A focus entry's level is **derived** from the stage's last
  semester via `focusLevelFor`, so there is one table to keep true rather than
  two that can drift; an entry states `level` only to override the derivation,
  for a subject that genuinely runs ahead of or behind its cohort — the three
  systems subjects open a tier lower at *Interview gear*, because that is where
  they first appear. An override may sit at most one tier below the derived
  level, which `courseTaxonomy.test.js` enforces.
  `suggestSemester(graduationYear)` derives a default from the year (four-year
  admission in August of `graduationYear − 4`) when a student has not stated
  one.

### Coding practice

| Collection | Purpose | Key fields |
|---|---|---|
| `problems` | Problem bank | `slug` (unique), `difficulty`, `statement`, `functionName`, `testCases[]` (`select:false`), `referenceSolution` (`select:false`) |
| `submissions` | Every run, pass or fail | `user`, `problem`, `code`, `verdict`, `runtimeMs` |
| `solvedproblems` | One row per user+problem on **first** acceptance | `user`+`problem` (unique), `difficulty` (denormalised), `solvedAt` |
| `bookmarks` | Saved problems | `user`, `problem` |

`testCases` and `referenceSolution` are `select: false` so a solution can
never leak through an ordinary problem fetch.

**`solvedproblems` is the single source of truth for "solved".** The
dashboard, the admin cohort view and the practice screen all read it, so
they cannot disagree. Deriving solved counts from `submissions` instead
would need a join for difficulty and would drift.

### Previous-year questions

| Collection | Purpose | Key fields |
|---|---|---|
| `questions` | PYQ library | `title`, `company`, `year`, `round`, `difficulty`, `askedCount`, `problem` (optional link) |
| `questionprogresses` | Solved / revisit marks | `user`, `question`, `status` |

`askedCount` drives the "asked N times" ranking on company hubs.

### Skill tests

Test and verified-skill attempts retain an on-device proctoring event ledger.
No camera frame is stored: only the event id, category and timestamps reach the
API. The first distinct event is a warning; the second changes the attempt to
`disqualified` and persists a zero score so dashboard and cohort analytics use
the enforced result.

| Collection | Purpose | Key fields |
|---|---|---|
| `tests` | Test definition | `slug` (unique), `category`, `durationMinutes`, `passPercentage`, `verifies[]` |
| `testquestions` | MCQs belonging to a test | `test`, `prompt`, `options[]` (exactly one `isCorrect`), `marks` |
| `testattempts` | A sitting | `user`, `test`, `questions[]`, `answers[]`, `expiresAt`, `score`, `passed` |

`expiresAt` is set server-side at start, so the clock cannot be extended by
tampering with the client.

### Mock interviews

| Collection | Purpose | Key fields |
|---|---|---|
| `interviewquestions` | Question bank | `round`, `difficulty`, `keywords[]`, `hint`, `modelAnswer` |
| `interviewsessions` | A round with scores | `user`, `questions[]` (fixed at start), `answers[]` with per-answer `dimensions` and `feedback`, `overallScore` |

`keywords` drive the relevance score. `modelAnswer` is withheld from the
live payload and only returned once the session is complete.

### Resume and companies

| Collection | Purpose | Key fields |
|---|---|---|
| `resumes` | Saved, tailored versions | `user`, `title`, `snapshot` (frozen profile copy), `atsScore`, `atsChecks[]` |
| `companies` | Prep hubs | `slug` (unique), `tier`, `difficulty`, `rounds[]`, `insights[]`, `focusAreas[]` |
| `reviewrequests` | Focused human-feedback workflow | `student`, `kind`, `resourceId`, `note`, `status`, `feedback`, `reviewer`, `reviewedAt` |
| `recruiterportalinvites` | Hashed, expiring and one-use links for external recruiter feedback | `recruiter`, `tokenHash`, `expiresAt`, `usedAt`, `createdBy` |

`snapshot` is a frozen copy of the profile at save time: a resume already
sent to an employer must not change when the profile is edited later.

## Relationships

```
User ─┬─ Profile              (1:1, unique)
      ├─ StudentJourney       (1:1, unique)
      ├─ ActionItem           (1:N) ── User (assignedBy, optional)
      ├─ MentorAppointment    (1:N) ── User (mentor, optional)
      ├─ Submission           (1:N) ── Problem
      ├─ SolvedProblem        (1:N) ── Problem   [unique per user+problem]
      ├─ Bookmark             (1:N) ── Problem
      ├─ QuestionProgress     (1:N) ── Question
      ├─ TestAttempt          (1:N) ── Test, TestQuestion
      ├─ InterviewSession     (1:N) ── InterviewQuestion
      ├─ Resume               (1:N)
      └─ ReviewRequest        (1:N) ── User (reviewer, optional)

Question ── Problem   (optional: a PYQ that is practisable)
TestQuestion ── Test  (N:1)
```

## Indexes

Every collection indexes its `user` field. Compound indexes cover the access
patterns that would otherwise scan:

- `submissions`: `{user, problem, createdAt}` and `{user, createdAt}` — the
  per-problem history and the streak calculation
- `solvedproblems`: `{user, problem}` unique — makes double-counting a first
  solve impossible at the database level
- `problems` / `questions`: `topics`, `companies`, `difficulty` for filters
- `interviewsessions`: `{user, status}` to find the one open session
- `reviewrequests`: `{student, kind, resourceId, status}` partial unique while requested, preventing duplicate open work while retaining completed feedback history
- `actionitems`: `{owner, status, dueAt}` for the chronological action centre
- `recruiterportalinvites`: TTL on `expiresAt`; only a SHA-256 token hash is stored

## Readiness score

Computed server-side in `dashboard.controller.js`, weighted:

| Component | Default weight | Source |
|---|---|---|
| Skills | 20% | Match to target role; required skills count twice |
| Coding | 30% | `solvedproblems` toward the target role's problem target |
| Resume | 20% | Transparent ATS checks over profile evidence |
| Interview | 20% | Mean completed `interviewsessions.overallScore` |
| Projects | 10% | Number and evidence depth of profile projects |

Staff can configure weights in `institutionconfigs`, where validation requires
them to total 100. Dashboard, cohort, eligibility and benchmark consumers all
call the same readiness service, so a student and a staff member see the same
number. Dashboard responses also include the formula version, calculation time
and evidence ledger used to produce it.
