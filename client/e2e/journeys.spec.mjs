/**
 * Frontend end-to-end journeys.
 *
 * Drives the real UI in a browser against the running dev server. Verifies
 * what a user actually experiences — navigation, guards, rendering, layout —
 * rather than component internals.
 *
 *   npm run test:e2e            (needs the dev server and an API running)
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const CHROME =
  process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = [];
let browser;

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function check(name, fn) {
  try {
    await fn();
    record(name, true);
  } catch (error) {
    record(name, false, error.message.split('\n')[0].slice(0, 120));
  }
}

/** Fails on any uncaught error or console error the user would never see. */
function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const text = m.text();
    // Font and asset fetches can fail in sandboxed environments without
    // meaning the app is broken.
    if (m.type() === 'error' && !/favicon|ERR_CONNECTION|net::ERR|404/.test(text)) {
      errors.push(text);
    }
  });
  return errors;
}

const ROUTES = [
  ['/dashboard', 'Welcome back'],
  ['/coding-practice', 'Coding Practice'],
  ['/skill-test', 'Skill Test'],
  ['/pyq-library', 'PYQ'],
  ['/company-prep', 'Prepare for a specific company'],
  ['/resume-builder', 'Resume Builder'],
  ['/ai-interview', 'AI Mock Interview'],
  ['/profile', ''],
];

async function main() {
  browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });

  // --- every route renders, with no runtime errors -------------------------
  for (const [route, expectedText] of ROUTES) {
    await check(`renders ${route}`, async () => {
      const page = await ctx.newPage();
      const errors = watchForErrors(page);

      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(400);

      if (expectedText) {
        const body = await page.textContent('body');
        if (!body.includes(expectedText)) {
          throw new Error(`expected to find "${expectedText}"`);
        }
      }
      if (errors.length) throw new Error(errors[0]);

      await page.close();
    });
  }

  // --- layout holds at both breakpoints ------------------------------------
  for (const [label, viewport] of [
    ['laptop 1366', { width: 1366, height: 768 }],
    ['mobile 390', { width: 390, height: 844 }],
  ]) {
    await check(`no horizontal overflow at ${label}`, async () => {
      const sized = await browser.newContext({ viewport });
      const page = await sized.newPage();
      const offenders = [];

      for (const [route] of ROUTES) {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 2) offenders.push(`${route} +${overflow}px`);
      }

      await sized.close();
      if (offenders.length) throw new Error(offenders.join(', '));
    });
  }

  // --- navigation ----------------------------------------------------------
  await check('sidebar navigates between sections', async () => {
    const page = await ctx.newPage();
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });

    await page.click('a[href="/coding-practice"]');
    await page.waitForURL('**/coding-practice', { timeout: 8000 });

    await page.click('a[href="/skill-test"]');
    await page.waitForURL('**/skill-test', { timeout: 8000 });

    await page.close();
  });

  await check('unknown routes show the 404 page', async () => {
    const page = await ctx.newPage();
    await page.goto(BASE + '/no-such-page', { waitUntil: 'networkidle' });

    const body = await page.textContent('body');
    if (!body.includes('Page not found')) throw new Error('expected the 404 screen');

    await page.close();
  });

  // --- mobile chrome -------------------------------------------------------
  await check('mobile shows the bottom bar and a working drawer', async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobile.newPage();
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });

    const bottomNav = await page.locator('nav[aria-label="Primary"]').isVisible();
    if (!bottomNav) throw new Error('the bottom bar should be visible on mobile');

    // The rail is off-canvas until the menu button opens it.
    await page.click('button[aria-label="Open navigation"]');
    await page.waitForTimeout(400);
    const drawerLink = page.locator('aside a[href="/profile"]');
    if (!(await drawerLink.isVisible())) throw new Error('the drawer should open');

    await mobile.close();
  });

  await check('the navigation rail is hidden on mobile until opened', async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobile.newPage();
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });

    const railLink = page.locator('aside a[href="/profile"]');
    if (await railLink.isVisible()) throw new Error('the rail should start off-canvas');

    await mobile.close();
  });

  // --- accessibility basics ------------------------------------------------
  await check('every icon-only control has an accessible name', async () => {
    const page = await ctx.newPage();
    const unnamed = [];

    for (const [route] of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(250);

      const found = await page.evaluate(() =>
        [...document.querySelectorAll('button, a')]
          .filter((el) => {
            const text = (el.textContent || '').replace(/\s/g, '');
            const iconOnly = el.querySelector('.material-symbols-outlined') && text.length <= 24;
            return iconOnly && !el.getAttribute('aria-label') && !el.getAttribute('title');
          })
          .map((el) => el.outerHTML.slice(0, 70)),
      );
      unnamed.push(...found.map((h) => `${route}: ${h}`));
    }

    await page.close();
    if (unnamed.length) throw new Error(`${unnamed.length} unnamed, e.g. ${unnamed[0]}`);
  });

  await check('each page has exactly one h1', async () => {
    const page = await ctx.newPage();
    const problems = [];

    for (const [route] of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(200);
      const count = await page.locator('h1').count();
      if (count !== 1) problems.push(`${route} has ${count}`);
    }

    await page.close();
    if (problems.length) throw new Error(problems.join(', '));
  });

  await browser.close();

  const failed = results.filter((r) => !r.passed);
  console.log(
    `\n${results.length - failed.length}/${results.length} passed` +
      (failed.length ? `\n${failed.length} failed` : ''),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error('E2E run failed:', error.message);
  await browser?.close();
  process.exit(1);
});
