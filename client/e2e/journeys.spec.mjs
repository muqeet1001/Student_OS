/**
 * End-to-end walk of the real application.
 *
 * Runs against a real server and a real database — not a mock. The previous
 * version of this file pointed at a throwaway mock API that was never
 * committed, had no way to authenticate, and asserted on copy the app had
 * long since changed. Nothing ran it, so it quietly asserted nothing.
 *
 *   npm run build --workspace client
 *   MONGO_URI="mongodb://127.0.0.1:27017/student_os" node server/src/seed/index.js --demo
 *   MONGO_URI="mongodb://127.0.0.1:27017/student_os" PORT=5055 NODE_ENV=production \
 *     node server/src/index.js &
 *   E2E_BASE_URL=http://localhost:5055 npm run e2e
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5055';
const EMAIL = process.env.E2E_EMAIL || 'demo@studentos.com';
const PASSWORD = process.env.E2E_PASSWORD || 'demo1234';

const CHROME =
  process.env.E2E_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** Routes every signed-in student can reach. */
const ROUTES = [
  '/dashboard',
  '/profile',
  '/skills',
  '/skill-test',
  '/coding-practice',
  '/pyq-library',
  '/resume-builder',
  '/roadmap',
  '/achievements',
  '/calendar',
  '/settings',
  '/jobs',
  '/tracker',
  '/company-prep',
  '/ai-interview',
];

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok  ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`  FAIL ${name}\n       ${error.message}`);
  }
}

/**
 * Collects genuine problems while a page is open.
 *
 * Blocked webfonts and favicons are sandbox facts rather than defects, so
 * they are filtered — but a failing API call is always a defect, and those
 * are the ones worth catching.
 */
function watch(page) {
  const problems = [];

  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !/favicon|font|ERR_CONNECTION|net::ERR/i.test(text)) {
      problems.push(`console: ${text.slice(0, 160)}`);
    }
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      problems.push(`api ${res.status()} ${res.url().replace(BASE, '')}`);
    }
  });

  return problems;
}

async function signIn(context) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);

  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.close();
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });

  await check('signs in with real credentials', () => signIn(context));

  for (const route of ROUTES) {
    await check(`renders ${route}`, async () => {
      const page = await context.newPage();
      const problems = watch(page);

      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(600);

      const audit = await page.evaluate(() => ({
        headings: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        // A raw icon name rendering as text means the font-reveal gate has
        // misfired — the failure that once filled this UI with the word
        // "arrow_forward".
        rawIcons: [...document.querySelectorAll('.material-symbols-outlined')]
          .filter((node) => getComputedStyle(node).visibility !== 'hidden')
          .map((node) => node.textContent.trim())
          .filter((text) => /^[a-z][a-z_]{4,}$/.test(text)),
      }));

      if (audit.headings.length !== 1) {
        problems.push(`expected one <h1>, found ${audit.headings.length}`);
      }
      if (audit.rawIcons.length) {
        problems.push(`icon names rendered as text: ${audit.rawIcons.slice(0, 3).join(', ')}`);
      }

      await page.close();
      if (problems.length) throw new Error(problems.join('; '));
    });
  }

  for (const [label, viewport] of [
    ['laptop 1366', { width: 1366, height: 768 }],
    ['mobile 390', { width: 390, height: 844 }],
  ]) {
    await check(`no horizontal overflow at ${label}`, async () => {
      const sized = await browser.newContext({ viewport });
      await signIn(sized);

      const page = await sized.newPage();
      const offenders = [];

      for (const route of ROUTES) {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 25000 });
        await page.waitForTimeout(250);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        // Two pixels of slack for sub-pixel rounding; anything more is a bug.
        if (overflow > 2) offenders.push(`${route} +${overflow}px`);
      }

      await sized.close();
      if (offenders.length) throw new Error(offenders.join(', '));
    });
  }

  await check('an unauthenticated visitor is sent to the login page', async () => {
    const stranger = await browser.newContext();
    const page = await stranger.newPage();

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 25000 });
    if (!page.url().includes('/login')) {
      throw new Error(`expected a redirect to /login, landed on ${page.url()}`);
    }

    await stranger.close();
  });

  await browser.close();

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  // A non-zero exit is what makes this usable in CI rather than decorative.
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
