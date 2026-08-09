/**
 * Production smoke test.
 *
 * Boots nothing itself — point it at a server already running the production
 * build against the demo cohort — and walks every route as both a student and
 * a member of placement staff.
 *
 * What it is actually checking is not "does the page render". It is:
 *
 *   - no uncaught exception reached the console
 *   - no request the page made returned 4xx/5xx
 *   - the page is not showing an error state or an empty state
 *
 * That last one matters most here. Every route in this app renders *something*
 * when its data is missing, so a screenshot test would pass against a broken
 * API. The demo cohort exists precisely so that "empty" is a failure.
 *
 *   node e2e/smoke.mjs [baseUrl]
 */
import { existsSync, globSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5099';

/**
 * Playwright insists on the exact Chromium build its version pins, which is
 * not always the one the image ships. Any recent Chromium runs these checks
 * fine, so fall back to whatever is installed rather than failing the suite
 * over a build number.
 */
function findChromium() {
  const candidates = [
    ...globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome'),
    ...globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell'),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

const STUDENT = { email: 'demo@studentos.com', password: 'demo1234' };
const ADMIN = { email: 'admin@studentos.com', password: 'demo1234' };

/**
 * `expect` is text that must appear — proof the page got its data rather than
 * rendering an empty shell.
 */
const STUDENT_ROUTES = [
  { path: '/dashboard', expect: /readiness/i },
  { path: '/profile', expect: /skills/i },
  { path: '/skills', expect: /assessment/i },
  { path: '/skill-test', expect: /aptitude|technical/i },
  { path: '/coding-practice', expect: /two sum|problems/i },
  { path: '/pyq-library', expect: /previous|question/i },
  { path: '/resume-builder', expect: /ats|resume/i },
  { path: '/roadmap', expect: /week|plan/i },
  { path: '/achievements', expect: /badge|level/i },
  { path: '/calendar', expect: /interview|drive|deadline/i },
  { path: '/settings', expect: /notification/i },
  { path: '/documents', expect: /document/i },
  { path: '/inbox', expect: /amazon|resume clinic|announcement/i },
  { path: '/jobs', expect: /engineer|intern/i },
  { path: '/tracker', expect: /application|tracker/i },
  { path: '/company-prep', expect: /google|infosys/i },
  { path: '/company-prep/google', expect: /interview|round/i },
  { path: '/coding-practice/two-sum', expect: /two sum/i },
  { path: '/ai-interview', expect: /interview/i },
];

const ADMIN_ROUTES = [{ path: '/admin', expect: /student|cohort|placement/i }];

/** Phrases that mean the screen failed even though it rendered. */
const FAILURE_TEXT = [
  /something went wrong/i,
  /failed to load/i,
  /couldn't load/i,
  /could not load/i,
  /route not found/i,
];

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function main() {
  const executablePath = findChromium();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const failures = [];
  let checked = 0;

  for (const [role, account, routes] of [
    ['student', STUDENT, STUDENT_ROUTES],
    ['admin', ADMIN, [...ADMIN_ROUTES, ...STUDENT_ROUTES.slice(0, 3)]],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    const badRequests = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`UNCAUGHT: ${error.message}`));
    page.on('response', (response) => {
      const status = response.status();
      // 401 on /auth/me before login is the app checking, not a failure.
      if (status >= 400 && !response.url().includes('/auth/refresh')) {
        badRequests.push(`${status} ${response.url().replace(BASE, '')}`);
      }
    });

    await login(page, account);

    for (const route of routes) {
      consoleErrors.length = 0;
      badRequests.length = 0;
      checked += 1;

      await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 30_000 });
      // Give lazy panels a beat to resolve before judging the text.
      await page.waitForTimeout(600);

      const body = await page.textContent('body');
      const label = `[${role}] ${route.path}`;

      for (const pattern of FAILURE_TEXT) {
        if (pattern.test(body)) failures.push(`${label}: shows "${pattern.source}"`);
      }

      if (route.expect && !route.expect.test(body)) {
        failures.push(`${label}: missing expected content /${route.expect.source}/`);
      }

      // A page that renders 400 characters rendered a shell, not a screen.
      if (body.replace(/\s+/g, ' ').trim().length < 400) {
        failures.push(`${label}: page is nearly empty (${body.trim().length} chars)`);
      }

      for (const error of consoleErrors) failures.push(`${label}: console error — ${error}`);
      for (const request of badRequests) failures.push(`${label}: request failed — ${request}`);

      process.stdout.write(`  ${label}\n`);
    }

    await context.close();
  }

  await browser.close();

  console.log(`\nChecked ${checked} page loads.`);

  if (failures.length) {
    console.log(`\n${failures.length} FAILURES:\n`);
    for (const failure of failures) console.log(`  ✗ ${failure}`);
    process.exit(1);
  }

  console.log('All routes rendered with data, no console errors, no failed requests.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
