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

> **Never commit `server/.env`.** This repository previously tracked one, so
> credentials from that file must be treated as exposed even after deletion:
> rotate the Atlas password, JWT/check-in secrets, and AI key before deploying.
> Store replacements in the deployment platform's secret manager.

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
| `npm test` | 470 tests — judge sandbox, interview scoring, seed integrity, production serving |
| `npm run seed` | Upsert reference data (safe to re-run) |
| `npm run seed:demo` | Also create the demo account and a full demo placement office |
| `npm run seed:fresh` | Wipe reference data first (leaves student data alone) |
| `npm run seed:demo:fresh` | Rebuild the demo cohort from scratch |
| `npm run e2e` | Browser smoke test over every route — see `e2e/README.md` |
| `npm run e2e:journeys` | Desktop/mobile browser audit for layout, icons, API errors, and auth redirects |
| `npm run e2e:authz` | Authorization probe — staff surfaces, role escalation, self-verification |

### What gets seeded

`npm run seed` writes **reference data** — the same content for any college,
and safe in any database:

| | |
|---|---|
| 19 coding problems | with real test cases the judge runs |
| 30 previous-year questions | linked to a practisable problem where one exists |
| 12 skill tests | 138 MCQs across aptitude, technical and communication |
| 40 interview questions | across rounds and difficulties |
| 12 company prep hubs | round structures, focus areas, preparation notes |
| 16 job postings | descriptions written as prose, so the parser is exercised |
| 10 skill assessments | 63 questions used to verify a skill |

`npm run seed:demo` adds a **demo placement office** on top: 73 students
across four graduating batches, plus the drives, offers, interview slots,
training sessions, recruiter records and announcements that make the staff
screens show something — and a practice history (solved problems, test
attempts, mock interviews, resumes) so the student screens are not a column
of zeroes. It is deterministic, so the same cohort appears on every machine.

Nothing in it invents a score. Test attempts are graded against the real
correct options, interview answers go through the same analyser the API calls,
and resumes are scored by the real ATS checker — so every number on a demo
screen is one the app can reproduce.

Sign in as `demo@studentos.com` for the student side or `admin@studentos.com`
for the placement office, both with `demo1234`.

This half is deliberately opt-in. Invented offers and placement rates do not
belong in a production database — an empty screen is obviously empty, while
"68% placed" reads as fact. Demo students live on `@students.demo.invalid`, a
TLD reserved by RFC 2606 that can never resolve, so a demo broadcast cannot
reach a real inbox even if SMTP is configured.

## Production notes

Things that were deliberate rather than incidental, and are easy to undo by
accident.

**No third-party CDN at runtime.** Fonts and icons are bundled. A smoke run on
a network without CDN access showed what the previous Google Fonts dependency
cost: Material Symbols addresses icons by ligature, so when its stylesheet
failed, all 115 icons in the app rendered their own names as plain text. This
runs on college networks, which block third-party origins routinely. Bundling
also keeps visitors' IPs off a third party on every page load. The icon font is
subset to the 84 icons actually used — 3.8 MB down to 66 KB — by
`client/scripts/build-icon-font.mjs`, which scrapes icon names from both
workspaces (the server names icons too, in notifications and today's plan) so
a newly added one cannot be silently left out.

**Liveness and readiness are separate.** `/api/health` says the process is
alive and never touches Mongo — wiring a restart to database health turns a
recoverable outage into a fleet-wide crash loop. `/api/health/ready` returns
503 when the database is unreachable. Point a load balancer at the second one
and a container restart policy at the first.

**Production refuses to start on known exposed secrets.** Historical values
are recognised by fingerprint and rejected in `NODE_ENV=production`, providing
a final guard against accidentally reusing credentials that appeared in git.

**Deploying.** `Dockerfile` builds one image serving the API and the built
client on one origin — deliberately, because the refresh token is an httpOnly
cookie and same-origin keeps it same-site with no CORS preflight. It runs as
`node`, not root, and its `HEALTHCHECK` uses readiness. Configuration is
supplied at run time; `server/.env` is in `.dockerignore` so local credentials
never enter an image layer.

```bash
docker build -t student-os .
docker run -p 5000:5000 \
  -e MONGO_URI="mongodb+srv://…/student_os" \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 48)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 48)" \
  -e CHECKIN_SECRET="$(openssl rand -hex 48)" \
  student-os
```

**Source maps are not shipped.** A production build was serving 4.2 MB of maps
beside 1.1 MB of code, publishing readable source with it. If you add an error
tracker, switch `sourcemap` to `'hidden'` in `client/vite.config.js` and upload
the maps to it rather than serving them.

## Features

**For students**

- **Six clear destinations** — Home, My Plan, Practice, Opportunities, Profile & Resume, and Updates replace a menu of disconnected tools; every existing tool remains available inside the relevant hub
- **Eligibility centre** — jobs are separated into recommended, eligible, needs-work, saved and applied views, with the specific blocker shown before a student spends time applying
- **Coding practice** — live Judge0 execution with real test cases, development-only local fallback, per-problem drafts and streaks
- **Skill tests** — server-timed, auto-scored; passing verifies a skill on the profile
- **PYQ library** — previous-year questions filterable by company, year, round and topic
- **Company prep** — real round structures, strategy notes, most-asked questions
- **AI mock interview** — scored on relevance, structure, specificity and delivery, with feedback that names what to fix
- **Resume builder** — generated from the profile, transparent ATS score, print to PDF, saved versions frozen at save time
- **Dashboard** — one weighted readiness score and what to do next
- **Roadmap** — a four-week plan whose items complete themselves from evidence, never from a checkbox
- **Achievements** — tiered badges and levels derived from work already recorded elsewhere
- **Calendar** — drives, tests and interviews, showing *your* slot time rather than the event's, with clashes flagged
- **Applications** — saved and applied roles live with opportunities, with stage tracking from application through offer
- **Human review** — students can request focused profile, resume or project feedback and receive the placement officer's response in the same workspace
- **Career Lab** — a job skill-gap simulator, evidence-grounded AI career mentor, live GitHub repository analyzer, placement-readiness simulator, and opt-in alumni/referral network
- **Public profiles** — students explicitly choose whether to publish their verified skills, projects, education and accomplishments; phone and email remain private, and referral discovery requires a second opt-in
- **Progress analytics** — 90-day readiness, coding, verified-skill, ATS and interview trends are shown together in My Plan
- **Settings** — notification categories, signed-in devices, and help

**For placement staff**

- **Action queue** — students are prioritised by concrete intervention signals such as no applications, incomplete profiles, repeated assessment failures, no interview practice or unverified skills
- **Review queue** — focused student requests can be answered and closed without moving the conversation to email
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
  src/models/           28 collections — see docs/database.md
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

- [`docs/database.md`](docs/database.md) — all 28 collections, relationships,
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

Uploaded avatars and certificates are written to `server/uploads`; mount a
persistent volume there on hosts with ephemeral filesystems. Student vault
documents are stored in MongoDB GridFS, so their metadata and bytes are backed
up together and survive application redeploys.

## Status

Working and tested: authentication and session revocation; profiles; coding
practice; PYQ progress; skill tests and detailed reviews; verified-skill
assessments; mock interviews and reports; resume versions; company prep;
dashboard, roadmap, achievements and notifications; jobs and application
tracking; calendar and QR check-in; document upload/download/review through
GridFS; and the complete placement-office workflow for cohorts, matching,
drives, offers, scheduling, recruiters, announcements, training and insights.

Not built yet: email verification and password reset, an admin UI for
authoring reference content (the seed script covers it for now), and external
object storage for profile avatars/certificate media (mount `server/uploads`
persistently in production).
