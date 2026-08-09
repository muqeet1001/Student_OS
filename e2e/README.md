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
