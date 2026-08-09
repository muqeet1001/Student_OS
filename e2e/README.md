# End-to-end smoke test

Walks every route as a student and as placement staff against a **production
build with the demo cohort seeded**, and fails on any of:

- an uncaught exception or console error
- a request the page made returning 4xx/5xx
- a page showing an error state, or rendering nearly empty
- a page missing the content it is supposed to show

That last check is the point. Every route in this app renders *something*
when its data is missing, so a test that only asserted "the page loaded"
would pass against a completely broken API. Seeding the demo cohort first is
what makes "this screen is empty" a failure rather than a valid state.

## Running it

```bash
# 1. a database with the demo cohort in it
docker run -d -p 27017:27017 --name student-os-mongo mongo:7
MONGO_URI="mongodb://127.0.0.1:27017/student_os" npm run seed:demo

# 2. a production build, served by the API
npm run build
cd server && MONGO_URI="mongodb://127.0.0.1:27017/student_os" NODE_ENV=production PORT=5099 \
  JWT_ACCESS_SECRET=$(openssl rand -hex 48) \
  JWT_REFRESH_SECRET=$(openssl rand -hex 48) \
  CHECKIN_SECRET=$(openssl rand -hex 48) \
  node src/index.js

# 3. the suite
npm run e2e                       # defaults to http://127.0.0.1:5099
npm run e2e -- https://your-host  # or point it anywhere
```

Production mode matters: it is the only mode that serves the built client,
applies the real cache headers, and hides stack traces. Running this against
the dev server would test a different application.

## Authorization probe

`npm run e2e:authz` asks a different question of the same running server:
given a valid *student* session, does the API ever hand over something that
is not theirs?

Unit tests already assert that middleware rejects the wrong role. They cannot
catch the failure that matters here — an endpoint that authenticates
correctly but forgets to scope its query to `req.user._id`. That endpoint
returns 200 with another student's offers and looks perfectly healthy.

It checks that staff surfaces are closed to students **and open to staff**
(the first half proves nothing on its own — an endpoint broken for everyone
would pass it), that anonymous and forged tokens are rejected, and two
outcome-based integrity checks:

- **Role escalation.** `role: "admin"` is posted to both profile endpoints,
  then the session is re-read. The validator strips unknown fields, so the
  write returns 200 and drops it — which means asserting on the status code
  would fail against a system behaving correctly. Only the state afterwards
  is evidence.
- **Self-verification.** A skill is posted with `verified: true`. A verified
  skill outranks a declared one in job matching and in the admin shortlist,
  and passing an assessment is supposed to be the only thing that sets it. If
  a student can set it by writing to their own profile, every verified badge
  in the system is worthless and the shortlists built on them are wrong.

The probe removes the skill it plants, so it can be run repeatedly.

```bash
npm run e2e:authz                       # defaults to http://127.0.0.1:5099
npm run e2e:authz -- https://your-host
```
