# Student OS — Outstanding Tasks

Audit of the working tree on branch `Ak` (commit `2be358f`).

**Current state**

| Check | Result |
|---|---|
| Working tree | 25 modified, 13 new — all uncommitted |
| Lint (`npm run lint`, `--max-warnings=0`) | Passes, 0 warnings |
| Unit tests (`npm run test:fast`) | 413 pass, 0 fail, 0 skipped |
| Full suite (`npm test`) | **599 pass, 0 fail** across all 27 suites (87.6s) — but only with a database reachable. Without `MONGO_URI`, `node:test` reports `# skipped 0` while all 12 integration suites are skipped, so this row is not evidence on its own. See **B5**. |
| Production build | Succeeds; icon font unchanged at 115 icons |
| `master` vs `Ak` | `master` is 1 commit behind (`2be358f` only on `Ak`) |
| In-code `TODO` / `FIXME` markers | None in `client/src`, `server/src`, `e2e` |

No task-tracking file (TODO/ROADMAP/BACKLOG/CHANGELOG) exists in the repo. The list
below is assembled from (a) the declared backlog in `README.md`, (b) gaps I verified
directly in the code, and (c) documentation drift. Each item cites its evidence.

---

## A. Declared backlog — `README.md` § Status

The README names exactly three unbuilt items. I verified each against the code.

### A1. Self-service password reset — **FIXED**
~~`server/src/routes/auth.routes.js` exposes only `PATCH /api/password`, which requires
an authenticated session. There is no `/forgot-password`, `/reset-password`, or
reset-token model.~~

Built. `POST /auth/password/forgot` issues a single-use, hashed, expiring link and
`POST /auth/password/reset` consumes it. See `B1` for the office-issued half and
`passwordReset.integration.test.js` for the flow coverage.

### A2. Email verification — **FIXED**

Built. Registration issues a single-use confirmation link; `POST /auth/verify-email`
consumes it and records `users.emailVerifiedAt`; `POST /auth/verify-email/resend`
sends a fresh one from Settings.

Three decisions worth recording:

- **Nothing is gated on confirmation.** Locking sign-in, practice or applications
  behind a confirmed address would immobilise every student on an installation with no
  mail relay configured — and the placement office can issue a password but cannot
  issue an inbox. It records a fact and surfaces it rather than standing in the way.
- **`emailVerifiedAt`, not `emailVerified`.** A timestamp for the same reason `usedAt`
  is one on the token collection: "verified" is a claim someone will one day have to
  audit, and "verified on 14 March" answers that question where a boolean does not.
- **The token is spent by the page's POST, not by loading the link.** Mail providers
  and security scanners routinely fetch URLs before the recipient sees them, so a link
  that consumed its token on GET would be dead before it was ever clicked.

**The collection was generalised rather than duplicated.** `PasswordResetToken`
became `OneTimeToken` with a `purpose` field (`password-reset`, `email-verification`),
because both flows need identical properties — random, hashed, expiring, claimed in a
single conditional write — and differ only in what happens afterwards. Two
collections would have meant two copies of the claim logic, and a single-use
guarantee is exactly the kind of thing that goes missing from the second copy.

That sharing is why `emailVerification.integration.test.js` pins the **cross-purpose
property** directly: a reset link must not confirm an email address, and a
confirmation link must not set a password. Both are asserted against a real database,
because `purpose` is the only thing separating two flows that share one collection.

Also covered: replay refused; expiry refused; confirming twice does not move the
recorded date; resend requires a session (a public endpoint taking an arbitrary
address would be a way to post mail to any student repeatedly); an already-confirmed
address is not re-sent a link; and the no-relay response says so rather than telling
a student to check an inbox that was never written to.

**Still open by design:** confirmation gates nothing, and with `SMTP_*` unset no link
can be delivered at all. Wiring a relay is a prerequisite for this feature being
visible to students — but not for it being correct.

### A3. Admin UI for authoring reference content — NOT BUILT (confirmed)
`client/src/features/admin/` covers students, drives, companies, tasks, training,
reports and settings. There is no surface for authoring coding problems, PYQs, skill
test papers, interview questions, skill assessments, company prep hubs or job
postings. `server/src/seed/data/` + `npm run seed` remain the only authoring path.

### A4. External object storage for media — NOT BUILT (restated)
Offloading media to S3/GCS/Cloudinary has not been done, but the premise this item
originally rested on was wrong. `server/src/middleware/upload.js` uses
`multer.memoryStorage()` and never touches disk; `profile.controller.js` writes
avatars and certificates through `services/fileStore.js`, which is GridFS — the same
store student vault documents use.

So there is no `server/uploads` volume to mount and no media lost on redeploy. The
real trade-off is scale: media grows with the database instead of with object
storage. Worth doing when a cohort's photos and PDFs stop fitting comfortably in
MongoDB, not before.

---

## B. Gaps confirmed in code — not listed anywhere in the docs

### B1. Staff-side password reset is promised but does not exist — **FIXED**
~~`client/src/pages/Settings.jsx:33-34` tells the student:

> "Password reset needs email, which is not connected yet. Ask the placement office to
> reset it for you in the meantime."

There is no such capability. `admin.controller.js` has no `password`/`reset` handler,
and `admin.routes.js` exposes no reset endpoint. Combining A1 and this means a student
who forgets their password has **no recovery path at all** — the documented fallback
is fictional.~~

Built. `POST /admin/students/:studentId/password-reset` issues a generated temporary
password, shown once and never stored, with `users.mustChangePassword` set so every
other route stays closed until the student replaces it. The help text now describes
what the software actually does.

### B2. CI does not run on the active branch — **FIXED**
`.github/workflows/ci.yml` triggered on `push` to `master` only (plus `pull_request`),
while all work was on `Ak`. `Ak` is now in the trigger list; remove it again once the
branch is merged.

Still worth doing: merge `Ak` → `master` so the branch stops being the de-facto
mainline.

### B3. Multi-language judging — NOT BUILT (declared, low priority)
`docs/CODE_EXECUTION.md` § "Adding another language" states the judge is
JavaScript-only and that `Submission.language` is a single-member enum. Adding a
language requires: an enum value, a runner module, and a starter template on the
problem. Confirmed — no other runner module exists under `server/src/services/codeRunner/`.

### B4. `AI_API_KEY` documented as gating interview feedback — **FIXED (docs)**

`README.md:37` claimed the variable was "Only for model-based interview feedback". It
is not: `interview.controller.js` imports only `answerAnalyzer.js` (rule-based), while
`aiClient.js` is consumed by `career.controller.js` (career mentor),
`placementInsights.js`, and `admin.controller.js` (status only).

Corrected the two false statements rather than wiring AI into interviews.
Deterministic, per-check-attributable scoring is a deliberate design decision, so
turning it into a model call is a product choice, not a documentation fix. `README.md`
now names the real consumers and states plainly that model-scored interviews would be
**an addition, not a switch**.

Still open (product decision): whether to add a model layer to interview feedback at
all.

### B5. A run with no database reported "0 skipped" — **FIXED**
All 12 `*.integration.test.js` suites register themselves as
`describe(name, { skip })`. node counts a skipped suite at the suite level and does
not add it to `# skipped`, so a machine with no `MONGO_URI` printed:

```
⚠  INTEGRATION TESTS SKIPPED (pwreset) — MONGO_URI is not set in server/.env
# tests 0
# suites 1
# pass 0
# fail 0
# skipped 0
```

Every route, role and populate assertion was absent while the summary looked clean,
and the gap only showed as 417 tests instead of 599.

`startHarness` now registers one top-level test alongside the banner: a reported
skip locally, and a hard failure whenever `CI` is set or `REQUIRE_DB=1`. CI still
provides a `mongo:7` service, so it never takes the failing branch.

---

## C. Pre-deployment security actions

### C1. Rotate all five exposed credential values — REQUIRED BEFORE DEPLOY
`README.md:41-44` states the repo previously tracked `server/.env` and that those
credentials must be treated as exposed. `server/src/config/publicSecrets.js` holds
fingerprints for five values, which confirms the scope:

| Variable | Fingerprinted |
|---|---|
| `MONGO_URI` | yes |
| `JWT_ACCESS_SECRET` | yes |
| `JWT_REFRESH_SECRET` | yes |
| `CHECKIN_SECRET` | yes |
| `AI_API_KEY` | yes |

Rotate the Atlas password and generate fresh secrets (`openssl rand -hex 48`), then
set them in the platform's secret manager — never in `server/.env`. Note the guard in
`assertSecretsAreNotPublic()` is fatal in production, so an un-rotated value produces
a boot failure rather than a silent insecure start.

### C2. `.env.example` shipped a non-empty placeholder `CHECKIN_SECRET` — **FIXED**

The placeholder was `change-me-to-a-long-random-string`: **33 characters**, so it
cleared the 32-character minimum in `productionValidation.js`, and it was never a
leaked value, so `publicSecrets.js` could not see it either. Both guards passed it.

That asymmetry was the actual defect. Every other secret in `.env.example` ships
**blank**, so a copied example file fails `required()` and stops the boot loudly and
immediately. `CHECKIN_SECRET` was the single exception, which made it the one
mistake that could reach production silently. Those codes are displayed on a
projector to a room, so a published signing secret means anyone who has read the
repository can forge attendance.

Written up as "worth confirming" in the first audit; confirming it showed the
placeholder was specifically worded and sized to pass both checks.

Fixed in three parts:

1. `.env.example` now ships `CHECKIN_SECRET` blank like every other secret, with the
   `openssl rand -hex 48` guidance moved into a comment. A naive copy now fails
   `required()` and forces the substitution.
2. `publicSecrets.js` gained `findPlaceholderSecrets()` and a `PLACEHOLDERS` list, so
   a copied placeholder is refused in production **whatever variable it lands in** —
   pasting it into a JWT secret is the same mistake.
3. A test asserts every secret in `.env.example` ships blank, so the asymmetry cannot
   return without a failure.

Verified by booting the real config in production mode, not only in unit tests:

| Case | Result |
|---|---|
| `CHECKIN_SECRET` = the placeholder | **Refused**, naming the variable |
| `CHECKIN_SECRET` = a real 48-char secret | Boots (no false positive) |
| Placeholder pasted into `JWT_ACCESS_SECRET` | **Refused** |

---

## D. Sandbox hardening (declared in `docs/CODE_EXECUTION.md`)

### D1. Real isolation for untrusted submissions — NOT BUILT (correctly deferred)
`docs/CODE_EXECUTION.md` § "What is NOT contained" is explicit: `node:vm` is not a
security boundary, and the local fallback is appropriate *only* for trusted local
development. The documented replacement options are per-submission Docker containers
(`--network=none`, read-only rootfs, pids limit), Linux `isolate`, or a hosted judge
such as Judge0/Piston. Production already defaults `CODE_RUNNER_FALLBACK_LOCAL=false`,
so this is a "before you open submissions to untrusted users" task, not a live bug.

---

## E. Documentation drift (low effort, all verified)

| # | Location | Status |
|---|---|---|
| E1 | `README.md` — "all **28** collections" | **Fixed.** Now 36, matching `docs/database.md`. |
| E2 | `docs/database.md` — "33 collections across **23** model files" | **Fixed.** Verified by loading every model through `app.js` and reading `mongoose.modelNames()`: **36** collections across **26** model files. (The seed logs "34 collections" because it only imports the models it writes.) |
| E3 | `.dockerignore` (comment) — "`server/.env` **is committed** to this repository" | **Fixed.** The comment now says `.env` is gitignored, that a local one holds live credentials, and that the repository historically tracked one — the same wording `publicSecrets.js` and `README.md` already used. |
| E4 | `docs/database.md` vs E3 | **Fixed** — resolved by the E3 rewrite. Both files now agree that `.env` is gitignored and was tracked only historically. |

---

## F. Dev-environment ergonomics

### F1. `docker-compose.yml` — **FIXED**
`README.md` and `e2e/README.md` instructed a manual
`docker run -d -p 27017:27017 --name student-os-mongo mongo:7` before tests,
`seed:demo`, and every e2e suite. Added `docker-compose.yml` running the same `mongo:7`
on the same port under the same container name, so no other instruction had to change.
Both READMEs now lead with `docker compose up -d` and keep the `docker run` form for
anyone who prefers it.

Two details worth knowing:

- It uses a **named volume**, so it also sidesteps the WiredTiger `directory-sync`
  panic the README documents — that failure comes from overlayfs, and a named volume
  sits on the host filesystem.
- It carries a **healthcheck**, because `up -d` otherwise returns before the server
  accepts connections, and a test run started immediately afterwards fails to connect
  and looks like a code failure.

YAML validated and the parsed structure asserted (image, port, volume, healthcheck).
**Not executed** — Docker is unavailable on this machine, so `docker compose up`
itself is unverified.

### F2. API reference — NOT BUILT
`docs/` holds only `database.md` and `CODE_EXECUTION.md`; the route files under
`server/src/routes/` are undocumented outside the controllers. A generated OpenAPI
document is the natural fix, but it is a real piece of work and has not been started.

---

## G. Defects found and fixed in the 19 October audit

Each was reproduced in the working tree before being changed, and lint, the unit
suite and the production build were re-run afterwards.

| # | Where | What was wrong | Fix |
|---|---|---|---|
| G1 | `client/src/components/MobileRouteNav.jsx` | The admin bottom bar filtered on `/admin/tasks` and `/admin/outcomes`, which had been renamed. It silently matched 3 of 5 links, so Action Centre and Reports were unreachable on mobile. | Filter on `/admin/actions` and `/admin/reports`. |
| G2 | `auth.controller.js` — `login` | The comment promised a comparison "regardless of whether the user exists"; the code short-circuited before bcrypt, so an unknown address answered in milliseconds and a known one in ~100 ms. | Always compare, against a throwaway cost-12 hash when no account matches. |
| G3 | `auth.controller.js` — `revokeOtherSessions` | With no refresh cookie, `presented` was `null` and the filter kept nothing: the caller's own session was deleted, then the response said "other sessions signed out". | Refuse with 400 when there is no session to preserve; report the real count otherwise. |
| G4 | `services/streak.service.js`, `services/todayPlan.js` | "Solve 3 DSA problems" was ticked after the first accepted submission of the day, because `done` came from `lastSolvedAt` rather than a count. | `computeStreak` returns `todaySolved`; the item needs three, and the hint reads "1 of 3 done today". |
| G5 | `middleware/error.js` | Every duplicate key was reported as "An account with that … already exists" — including company slugs and drive titles. | Neutral wording naming only the field. |
| G6 | `hooks/useApiResource.js`, `ResumeBuilder.jsx` | `enabled: false` left `loading: true` forever, so a guarded spinner could never resolve. `ResumeBuilder`'s `/jobs/top-matches` fallback was only reachable when `enabled` was false — i.e. never. | Clear the flag when disabled; drop the contradictory fallback. |
| G7 | `tests/helpers/integrationHarness.js` | Skipped suites were invisible in the summary (see **B5**). | Top-level sentinel test: one visible skip locally, failure under `CI`/`REQUIRE_DB`. |
| G8 | `client/src/pages/VerifyEmail.jsx` | Read `data.email`, which that endpoint does not return, so the confirmed address never appeared. | Read `data.user.email`. |
| G9 | `pages/AdminDashboard.jsx` | `scope.seasonName` was derived from `institution.placementSeasonName` and read by nothing; a named season appeared nowhere. | The picker label shows the configured name, falling back to "Placement season". |
| G10 | `config/env.js`, `services/aiClient.js`, `server/.env.example` | The client speaks the Anthropic Messages API, but the shipped defaults were `api.openai.com/v1` + `gpt-4o-mini`: `POST /messages` with an Anthropic body against an OpenAI endpoint, failing as a silent 404. A key with no model was sent as an empty `model`, reading as an outage. | Defaults point at the Anthropic Messages endpoint; no model is invented; the feature reports itself unavailable unless key **and** model are set. |
| G11 | `README.md`, `Dockerfile`, `config/env.js`, `index.js`, `app.js` | Deployment docs and the image instructed a persistent `server/uploads` volume, and `uploadsDir` was created and never written. | Removed the dead directory and corrected the docs: all media is GridFS. |
| G12 | `docs/database.md` | "25 model files". | 26 — 36 collections across 26 files. |
| G13 | `.github/workflows/ci.yml` | CI never ran on `Ak`. | Added to the push trigger (see **B2**). |

---

## Suggested order

1. **C1** — rotate secrets. Blocks any real deployment, and it is the one item nobody
   but you can do: it needs your Atlas credentials and the platform's secret manager.
2. ~~**C2** — the unguarded `CHECKIN_SECRET` placeholder.~~ **Done.** A real security
   gap, closed.
3. ~~**B1 / A1** — password recovery.~~ **Done.** See `## Password recovery, as built`.
4. **B2** — commit the change set, then merge `Ak` into `master` so CI covers it.
5. **A3** — the substantial feature left: surfaces for authoring reference content,
   so the seed script stops being the only way in. Multi-week.
6. ~~**A2** — email verification.~~ **Done.** See `## A. Declared backlog`.
6. ~~**E1–E4** — documentation drift.~~ **Done.**
7. ~~**B4** — the `AI_API_KEY` claim.~~ **Done (docs).**
8. ~~**F1** — `docker-compose.yml`.~~ **Done.**
9. **A4, B3, D1, F2** — deployment-scale, optional, or correctly deferred.

---

## Password recovery, as built

Closes **A1** and **B1**, the two issues that together left a student with a forgotten
password no way back in.

**Two paths, because one of them needs nothing configured.**

| Path | Endpoint | Depends on |
|---|---|---|
| Self-service link | `POST /auth/password/forgot`, `POST /auth/password/reset` | SMTP. Without it the response says so plainly instead of claiming a send. |
| Office-issued temporary password | `POST /admin/students/:studentId/password-reset` | Nothing. This is the path that works on a college with no mail relay. |

**Properties, each covered by a test:**

- The reset token is 256 bits of randomness, stored only as a SHA-256 hash, expiring on
  `PASSWORD_RESET_TTL_MINUTES` (default 30), and claimed with one conditional write so a
  link is single-use rather than merely short-lived.
- `POST /auth/password/forgot` answers byte-identically for a registered and an unknown
  address — including the response *fields*, so it cannot be used to discover who has an
  account. It also uses a rate limiter that counts successes, because the shared
  credential limiter skips them and would never have fired here.
- The office password is generated (unbiased `crypto.randomInt`, alphabet with no 0/O or
  1/I/L because it gets read aloud), shown exactly once, never stored in plaintext, and
  never written to the audit log.
- `users.mustChangePassword` closes every route except `/set-password` until the student
  replaces it, enforced in `ProtectedRoute`.
- Every route that replaces a password — ordinary change, self-service reset, office
  issue — clears `users.refreshTokens`, so no session outlives the credential it was
  opened with, and voids any outstanding reset link.

**Files.** New: `server/src/models/PasswordResetToken.js`,
`server/src/services/passwordReset.js`, `client/src/pages/{ForgotPassword,ResetPassword,SetPassword}.jsx`,
`server/tests/passwordReset.test.js`, `server/tests/passwordReset.integration.test.js`.
Changed: `auth.controller.js`, `auth.routes.js`, `auth.validators.js`, `admin.controller.js`,
`admin.routes.js`, `mailer.js` (a transactional `sendEmail` alongside the bulk sender),
`User.js`, `config/env.js`, `AuthContext.jsx`, `ProtectedRoute.jsx`, `App.jsx`, `Login.jsx`,
`Settings.jsx`, `StudentDetail.jsx`, plus `README.md` and `docs/database.md`.

**Verified.** 400 unit tests and 11 integration tests pass; lint is clean under
`--max-warnings=0`; the production build succeeds. No local MongoDB or Docker was
available, so the integration suite was run against an in-memory MongoDB — CI's
`mongo:7` service remains the authoritative run.

**One thing to know.** Three icons were added (`link_off`, `login`, `mark_email_read`),
so the subset font was regenerated and committed. `icons.json` and the `.woff2` are part
of this change — without them CI's staleness check fails and those three render as plain
text in production.
