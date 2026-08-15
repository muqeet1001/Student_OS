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
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@studentos.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'demo1234';

// Let Playwright resolve the browser it installed on the current platform.
// A custom executable is still useful in slim CI images, but the old
// Linux-only default made this suite fail immediately on Windows and macOS.
const CHROME = process.env.E2E_CHROME;

/** Routes every signed-in student can reach. */
const ROUTES = [
  '/dashboard',
  '/my-plan',
  '/practice',
  '/opportunities',
  '/career-profile',
  '/updates',
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
  '/career-lab',
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

async function signIn(context, { email = EMAIL, password = PASSWORD, destination = /dashboard/ } = {}) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  await Promise.all([
    page.waitForURL(destination, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.close();
}

async function main() {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
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
          .filter((node) => {
            const style = getComputedStyle(node);
            // A loaded ligature is roughly one em wide. Checking fontFamily
            // cannot tell whether the face actually loaded: computed styles
            // retain the requested family while the browser renders fallback
            // text. A much wider box is the raw icon name leaking through.
            return (
              style.visibility !== 'hidden' &&
              node.getBoundingClientRect().width > parseFloat(style.fontSize) * 1.75
            );
          })
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

  await check('admin lands in and can open every placement-office module', async () => {
    const staff = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await signIn(staff, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, destination: /\/admin$/ });

    const page = await staff.newPage();
    const problems = watch(page);
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 25000 });

    const tabs = page.getByRole('tab');
    if ((await tabs.count()) !== 5) problems.push(`expected 5 primary admin workflows, found ${await tabs.count()}`);

    for (let index = 0; index < (await tabs.count()); index += 1) {
      await tabs.nth(index).click();
      await page.waitForTimeout(350);
      const body = await page.locator('body').innerText();
      if (/something went wrong|failed to load|could not load|route not found/i.test(body)) {
        problems.push(`admin module failed: ${await tabs.nth(index).innerText()}`);
      }
    }

    const moreTools = page.getByLabel('More placement tools');
    for (const value of ['interventions', 'reviews', 'cohort', 'companies', 'alumni', 'announcements']) {
      await moreTools.selectOption(value);
      await page.waitForTimeout(350);
      const body = await page.locator('body').innerText();
      if (/something went wrong|failed to load|could not load|route not found/i.test(body)) {
        problems.push(`admin tool failed: ${value}`);
      }
    }

    await staff.close();
    if (problems.length) throw new Error(problems.join('; '));
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
