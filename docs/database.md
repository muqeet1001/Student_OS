# Database

MongoDB via Mongoose. 15 collections across 10 model files.

## Connecting

Set `MONGODB_URI` in `server/.env` (gitignored — never commit a real URI):

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/student_os?retryWrites=true&w=majority
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
| `users` | Account and credentials | `email` (unique), `password` (hashed, `select:false`), `role` (`student`\|`admin`), `refreshTokens[]` |
| `profiles` | Everything a resume is built from | `user` (unique), `headline`, `bio`, `skills[]`, `projects[]`, `education[]`, `experience[]`, `certifications[]`, `completeness` |

One profile per user, enforced by a unique index on `profile.user`.

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

`snapshot` is a frozen copy of the profile at save time: a resume already
sent to an employer must not change when the profile is edited later.

## Relationships

```
User ─┬─ Profile              (1:1, unique)
      ├─ Submission           (1:N) ── Problem
      ├─ SolvedProblem        (1:N) ── Problem   [unique per user+problem]
      ├─ Bookmark             (1:N) ── Problem
      ├─ QuestionProgress     (1:N) ── Question
      ├─ TestAttempt          (1:N) ── Test, TestQuestion
      ├─ InterviewSession     (1:N) ── InterviewQuestion
      └─ Resume               (1:N)

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

## Readiness score

Computed server-side in `dashboard.controller.js`, weighted:

| Component | Weight | Source |
|---|---|---|
| Coding | 35% | `solvedproblems` ÷ published problems |
| Tests | 25% | mean `testattempts.percentage` |
| Interview | 20% | mean `interviewsessions.overallScore` |
| Profile | 20% | `profiles.completeness` |

The admin cohort view uses the same weights, so a student and a staff member
always see the same number.
