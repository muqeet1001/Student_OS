/**
 * A user agent string, rendered as something a student can recognise.
 *
 * Deliberately small and dependency-free. The only question this has to
 * answer is "is one of these sessions not me?", which needs a browser and an
 * operating system and nothing else. A full UA-parsing library would add a
 * dependency and a monthly database update to earn version numbers nobody
 * would read.
 *
 * Order matters throughout: Edge advertises Chrome, Chrome advertises Safari,
 * and every mobile browser advertises Mozilla. Specific always wins.
 */

const BROWSERS = [
  [/\bEdgA?\//, 'Edge'],
  [/\bOPR\/|\bOpera\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFirefox\/|\bFxiOS\//, 'Firefox'],
  [/\bCriOS\//, 'Chrome'],
  [/\bChrome\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
];

const PLATFORMS = [
  [/\biPhone\b/, 'iPhone'],
  [/\biPad\b/, 'iPad'],
  [/\bAndroid\b/, 'Android'],
  [/\bWindows\b/, 'Windows'],
  // Checked after iPhone/iPad, which also carry "like Mac OS X".
  [/\bMac OS X\b|\bMacintosh\b/, 'Mac'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bLinux\b/, 'Linux'],
];

const match = (table, value) => table.find(([pattern]) => pattern.test(value))?.[1] ?? null;

/**
 * @param {string} userAgent
 * @returns {string} e.g. "Chrome on Windows", or "Unknown device".
 */
export function describeUserAgent(userAgent) {
  const value = String(userAgent ?? '').trim();
  if (!value) return 'Unknown device';

  const browser = match(BROWSERS, value);
  const platform = match(PLATFORMS, value);

  if (browser && platform) return `${browser} on ${platform}`;
  if (browser) return browser;
  if (platform) return platform;

  // Something non-standard — a script, a curl, an app webview. Showing the
  // raw string truncated is more useful than "Unknown", because an
  // unrecognised session is exactly the one worth looking at.
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}
