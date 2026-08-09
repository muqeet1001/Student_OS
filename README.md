# Student OS

A placement-readiness platform for engineering students. Practice, verification,
presentation and institutional oversight share one data model, so every activity
feeds a single readiness score that means something.

**MERN** — MongoDB · Express · React 19 · Node 20+

---

## Quick start

```bash
git clone https://github.com/muqeet1001/Student_OS.git
cd Student_OS
npm install

cp server/.env.example server/.env    # then fill it in — see below
npm run seed:demo                     # reference data + a full demo cohort to look at
npm run dev                           # client :5173, API :5000
```

With `MONGO_URI` left blank in development, the API boots an ephemeral
in-memory MongoDB so a fresh clone runs with zero setup. Data is lost on
restart — set a real URI to persist anything.

## What you need to provide

Four values are required in production. Everything else has a working default.

| Variable | Required | How to get it |
|---|---|---|
| `MONGO_URI` | production | Atlas connection string, **including the database name**: `…mongodb.net/student_os?retryWrites=true&w=majority`. Allow your server's IP under Atlas → Network Access. |
| `JWT_ACCESS_SECRET` | production | `openssl rand -hex 48` |
| `JWT_REFRESH_SECRET` | production | `openssl rand -hex 48` — must differ from the access secret |
| `CHECKIN_SECRET` | production | `openssl rand -hex 48` — signs attendance codes. Its own secret, because those codes are displayed on a projector to a room. |
| `AI_API_KEY` | optional | Only for model-based interview feedback. Scoring works fully without it. |

`server/.env.example` documents every variable.

> **`server/.env` is committed to this repository on purpose**, so that
> collaborators can clone and run without setup. That is a deliberate
> trade-off, and it has a consequence worth stating plainly: **every secret
> in that file is public.** Anyone who can read this repository can read the
> database password. Before this is used with real student data, generate
> fresh secrets, rotate the Atlas password, and untrack the file
> (`git rm --cached server/.env`). Committed credentials stay in git history
> even after deletion, so rotating is the only real fix.

## Running the tests

Unit tests need nothing. The integration suites need a real MongoDB, and
**say so loudly when they cannot find one** rather than skipping quietly —
a skipped suite that looks like a passing suite is how three real bugs
survived to production-adjacent code here.

```bash
docker run -d -p 27017:27017 --name student-os-mongo mongo:7
MONGO_URI="mongodb://127.0.0.1:27017/student_os" npm test
```

Each suite writes to its own `student_os_<suffix>` database and drops it on
the way in and out, so your development data is never touched.

If MongoDB dies with a WiredTiger `directory-sync` panic, its data directory
is on a filesystem that cannot `fsync()` a directory — overlayfs and tmpfs
both fail this. Bind-mount a real one:
`-v /var/lib/mongo-data:/data/db`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Client and API together, both with hot reload |
| `npm run build` | Production client build into `client/dist` |
| `npm start` | Production API, which also serves the built client |
| `npm test` | 446 tests — judge sandbox, interview scoring, seed integrity, production serving |
| `npm run seed` | Upsert reference data (safe to re-run) |
| `npm run seed:demo` | Also create the demo account and a full demo placement office |
| `npm run seed:fresh` | Wipe reference data first (leaves student data alone) |
| `npm run seed:demo:fresh` | Rebuild the demo cohort from scratch |

### What gets seeded

`npm run seed` writes **reference data** — the same content for any college,
and safe in any database:

| | |
|---|---|
| 19 coding problems | with real test cases the judge runs |
| 30 previous-year questions | linked to a practisable problem where one exists |
| 12 skill tests | 138 MCQs across aptitude, technical and communication |
| 34 interview questions | across rounds and difficulties |
| 12 company prep hubs | round structures, focus areas, preparation notes |
| 16 job postings | descriptions written as prose, so the parser is exercised |
| 10 skill assessments | 63 questions used to verify a skill |

`npm run seed:demo` adds a **demo placement office** on top: 72 students
across four graduating batches, plus the drives, offers, interview slots,
training sessions, recruiter records and announcements that make the staff
screens show something. It is deterministic, so the same cohort appears on
every machine.

This half is deliberately opt-in. Invented offers and placement rates do not
belong in a production database — an empty screen is obviously empty, while
"68% placed" reads as fact. Demo students live on `@students.demo.invalid`, a
TLD reserved by RFC 2606 that can never resolve, so a demo broadcast cannot
reach a real inbox even if SMTP is configured. Any of those addresses signs in
with `demo1234`.

## Features

**For students**

- **Coding practice** — sandboxed judge with real test cases, per-problem drafts, streaks
- **Skill tests** — server-timed, auto-scored; passing verifies a skill on the profile
- **PYQ library** — previous-year questions filterable by company, year, round and topic
- **Company prep** — real round structures, strategy notes, most-asked questions
- **AI mock interview** — scored on relevance, structure, specificity and delivery, with feedback that names what to fix
- **Resume builder** — generated from the profile, transparent ATS score, print to PDF, saved versions frozen at save time
- **Dashboard** — one weighted readiness score and what to do next
- **Roadmap** — a four-week plan whose items complete themselves from evidence, never from a checkbox
- **Achievements** — tiered badges and levels derived from work already recorded elsewhere
- **Calendar** — drives, tests and interviews, showing *your* slot time rather than the event's, with clashes flagged
- **Jobs and tracker** — matched roles, applications through to offer
- **Settings** — notification categories, signed-in devices, and help

**For placement staff**

- **Cohort view** — every student's readiness, filterable by branch, graduation year and risk band, with a per-student drill-down
- **Job matcher** — paste a JD, get a ranked shortlist with the reason for every score
- **Drives** — eligibility, bulk shortlisting, CSV export
- **Offers and placement report** — placement rate counted by distinct student, median package alongside the mean
- **Placement calendar** — interview slots generated across parallel panels, with cross-event double-bookings surfaced
- **QR attendance** — rotating check-in codes for events and training sessions
- **Company CRM** — contacts, visit history derived from drives, and recruiter feedback aggregated into fundable themes
- **Training** — sessions, attendance, and effectiveness measured against a comparison group rather than against nothing
- **Insights** — cohort-wide gaps turned into training recommendations that name a headcount

## Architecture

```
client/                 React 19 + Vite + Tailwind v4
  src/pages/            One file per route
  src/features/         Feature-scoped components
  src/components/       Shared UI (layout, modal, form fields, state blocks)
  src/hooks/            useApiResource, useDebouncedValue, useSpeechInput
  src/context/          AuthContext — access token in memory, refresh in cookie

server/                 Express + Mongoose
  src/models/           15 collections — see docs/database.md
  src/controllers/      Route handlers
  src/services/         codeRunner (VM sandbox), answerAnalyzer, atsScore,
                        streak, notifications, token
  src/middleware/       auth, validate (zod), upload, error
  src/seed/             Reference data and the seed runner
```

**One service in production.** `npm start` serves the API and the built client
from the same origin, so the refresh cookie is same-site and there is no CORS
preflight. Deploy with `npm install && npm run build`, start with `npm start`.

### Design decisions worth knowing

- **Access tokens live in memory, never `localStorage`** — an XSS bug cannot
  read them. The refresh token is an httpOnly cookie, rotated on every use and
  stored server-side so it can be revoked.
- **Submitted code runs in a `node:vm` sandbox** with a timeout, output cap and
  no module access. Tests cover constructor-chain escape attempts.
- **Test timers are server-side.** `expiresAt` is set at start, so the clock
  cannot be extended from the client.
- **Interview scoring is deterministic**, not a model call. Every point is
  attributable to a named check, which is what makes the feedback actionable.
  An LLM can be layered on via `AI_API_KEY`.
- **`solvedproblems` is the single source of truth for "solved"**, read by the
  student dashboard, the practice screen and the admin cohort view alike, so
  they cannot disagree.
- **Saved resumes freeze a profile snapshot** — a resume already sent to an
  employer must not change when the profile is edited later.

## Documentation

- [`docs/database.md`](docs/database.md) — all 15 collections, relationships,
  indexes and the readiness weighting

## Deployment

Any Node host (Render, Railway, Fly, a VM):

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Node version | 20 or newer |
| Health check | `GET /api/health` |

Set `NODE_ENV=production`, `MONGO_URI` and both JWT secrets in the host's
environment. The server refuses to boot in production without them rather than
falling back to insecure defaults.

Uploaded avatars and certificates are written to `server/uploads`. On a host
with an ephemeral filesystem, mount a persistent volume there or move uploads
to object storage before going live.

## Status

Working and tested: authentication, profiles, coding practice, PYQ library,
skill tests, mock interviews, resume builder, company prep, admin cohort view,
dashboard.

Not built yet: email verification and password reset, an admin UI for
authoring content (the seed script covers it for now), and object storage for
uploads.
