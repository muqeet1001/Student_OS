/**
 * Builds the self-hosted icon font from the icons this app actually uses.
 *
 * WHY THIS EXISTS
 * ---------------
 * The app used to pull its text fonts and its icon font from the Google Fonts
 * CDN at runtime. That is three problems in one:
 *
 *   1. It breaks on a restricted network. This is a campus placement portal;
 *      college networks and corporate proxies block third-party CDNs
 *      routinely. When the icon stylesheet fails, every icon falls back to
 *      rendering its own ligature name, so the navigation reads
 *      "dashboard code school menu" in plain text. Not degraded — broken.
 *      A smoke run against a sandbox without CDN access showed exactly this.
 *   2. It sends every visitor's IP to a third party on every page load
 *      without consent, which German courts have found unlawful under GDPR.
 *   3. It costs a DNS lookup, a TLS handshake and a render-blocking round
 *      trip to an origin we do not control.
 *
 * Bundling the npm package instead trades one problem for another: the full
 * variable font is 3.8 MB, worse than the CDN for anyone who could reach it.
 * So it is subset to the icons in use — see subset-icon-font.py for why the
 * ligature table has to be rebuilt rather than subset.
 *
 * WHY THE ICON LIST IS DERIVED, NOT MAINTAINED
 * --------------------------------------------
 * A hand-kept list goes stale silently: someone adds an icon, the build does
 * not include it, and it renders as a word in production — the exact failure
 * this script exists to prevent. So the list is scraped from the source, from
 * BOTH workspaces: the client renders icon names written in JSX, but it also
 * renders names the server sends it (notifications, today's plan, role
 * profiles, achievements). Scanning only the client would miss those and ship
 * a font with holes in it.
 *
 *   node scripts/build-icon-font.mjs
 *
 * Runs automatically before `npm run build`. Needs Python with fonttools and
 * brotli (`pip install fonttools brotli`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(here, '..');
const repoRoot = path.resolve(clientRoot, '..');

/*
 * Resolved through Node rather than assembled as a path.
 *
 * Assuming `<repo>/node_modules/material-symbols/…` assumes npm hoisted the
 * package to the workspace root, which it does not always do — inside the
 * Docker build it landed under client/node_modules and this script declared
 * the package missing and failed the image build.
 */
function resolveSourceFont() {
  try {
    return fileURLToPath(
      import.meta.resolve('material-symbols/material-symbols-outlined.woff2'),
    );
  } catch {
    return null;
  }
}

const SOURCE_FONT = resolveSourceFont();
const OUT_DIR = path.join(clientRoot, 'src/assets/fonts');
const OUT_FONT = path.join(OUT_DIR, 'material-symbols-subset.woff2');
const OUT_MANIFEST = path.join(OUT_DIR, 'icons.json');

/** Directories scanned for icon names, in both workspaces. */
const SCAN_DIRS = [path.join(clientRoot, 'src'), path.join(repoRoot, 'server/src')];

const PATTERNS = [
  // <span className="material-symbols-outlined …">home</span>
  /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g,
  // { icon: 'home' } — how the server names an icon, and how client tables do
  /\bicon:\s*'([a-z0-9_]+)'/g,
  /\bicon:\s*"([a-z0-9_]+)"/g,
];

/**
 * Icons referenced somewhere a regex cannot see them — a computed name, or a
 * value that arrives from data. Listed explicitly so they are still bundled.
 * Keep this short; if it grows, the pattern list above is the thing to fix.
 */
const ALWAYS_INCLUDE = ['error', 'info', 'warning', 'check', 'close', 'help'];

function walk(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
  }

  return files;
}

function collectIcons() {
  const icons = new Set(ALWAYS_INCLUDE);

  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of PATTERNS) {
        for (const match of source.matchAll(pattern)) icons.add(match[1]);
      }
    }
  }

  return [...icons].sort();
}

/**
 * Falls back to the committed font, or fails if there is not one.
 *
 * Regenerating is a convenience; having a font at all is not. Anything that
 * stops the subsetter running — no Python, no source package — should leave a
 * buildable tree behind, and only stop the build outright when there is
 * genuinely nothing to ship.
 */
function fallBackToCommitted(reason) {
  if (existsSync(OUT_FONT)) {
    console.warn(`⚠ ${reason} — using the committed icon font.`);
    console.warn('  Icons added since it was last built will render as plain text.');
    console.warn('  To regenerate: npm install && pip install fonttools brotli');
    return true;
  }

  console.error(`✗ ${reason}, and there is no committed font to fall back on.`);
  return false;
}

function main() {
  if (!SOURCE_FONT || !existsSync(SOURCE_FONT)) {
    if (fallBackToCommitted('The material-symbols package is not installed')) return;
    process.exit(1);
  }

  const icons = collectIcons();

  if (icons.length < 10) {
    console.error(`✗ Only found ${icons.length} icons — the scan is broken. Refusing to build.`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let result;
  try {
    const stdout = execFileSync(
      'python3',
      [path.join(here, 'subset-icon-font.py')],
      {
        input: JSON.stringify({ source: SOURCE_FONT, icons, output: OUT_FONT }),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'inherit'],
      },
    );
    result = JSON.parse(stdout);
  } catch (error) {
    /*
     * The generated font is committed, so a machine without the Python
     * toolchain can still build and run — it just cannot regenerate. Failing
     * here instead would mean `npm install && npm run build` no longer works
     * on a fresh clone without `pip install fonttools brotli` first, which is
     * a steep price for a step that matters only when the icon set changes.
     *
     * The warning is loud because a stale font is the failure this whole
     * script exists to prevent: a newly added icon would render as a word.
     */
    if (fallBackToCommitted('Icon font subsetting failed')) return;
    throw error;
  }

  /*
   * The manifest holds only what the source scan produced — no byte counts.
   *
   * It is what CI diffs to catch a newly added icon that nobody regenerated
   * the font for. That check has to be reproducible, and the woff2 itself is
   * not: brotli output shifts between fontTools versions, so comparing the
   * binary would fail whenever CI's toolchain differed from a developer's.
   * The icon list is a pure function of the source, so it does not.
   */
  writeFileSync(
    OUT_MANIFEST,
    `${JSON.stringify(
      { generated: 'scripts/build-icon-font.mjs', icons: result.icons, missing: result.missing },
      null,
      2,
    )}\n`,
  );

  /*
   * A name that is not in the font renders as letters, which is the failure
   * this whole script exists to prevent — so it is reported loudly rather
   * than left for someone to notice on a screenshot.
   */
  if (result.missing.length) {
    console.warn(`⚠ ${result.missing.length} icon name(s) not in the font: ${result.missing.join(', ')}`);
    console.warn('  These will render as plain text. Check the spelling against fonts.google.com/icons.');
  }

  const { sourceBytes, outputBytes } = result;
  console.log(
    `✓ Icon font: ${result.icons.length} icons, ` +
      `${(sourceBytes / 1024 / 1024).toFixed(2)} MB → ${(outputBytes / 1024).toFixed(1)} KB ` +
      `(${(100 - (outputBytes / sourceBytes) * 100).toFixed(1)}% smaller)`,
  );
}

main();
