import { createHash } from 'node:crypto';

/**
 * Refuses to start a production server on secrets that are public.
 *
 * This repository historically tracked a server/.env. Removing it does not
 * remove those credentials from git history, so their fingerprints remain a
 * useful last line of defence against accidental reuse in production.
 *
 * Stored as truncated SHA-256 rather than as the literals themselves. The
 * strings are already public, so this is not hiding anything — it just avoids
 * copying credentials into a second file, where they would need rotating
 * twice and would show up in every grep for the real secret.
 */
const PUBLISHED = new Map([
  ['d9e8db8786888ef6d455eb8f5570330b', 'JWT_ACCESS_SECRET'],
  ['dc3f538a0bcb07d9a36a9332c2f6ea75', 'JWT_REFRESH_SECRET'],
  ['8dd92dc431099c8ebe9798e0828e7a78', 'CHECKIN_SECRET'],
  ['6eef4cbebe9e4f9e853fb453e333b7d6', 'MONGO_URI'],
  ['48f5df25643cfa86f287f9ade91577fa', 'AI_API_KEY'],
]);

const fingerprint = (value) =>
  createHash('sha256').update(String(value)).digest('hex').slice(0, 32);

/**
 * @param {Record<string, string|undefined>} values Candidate config values,
 *   keyed by the environment variable they came from.
 * @returns {string[]} Names of the variables still set to a published value.
 */
export function findPublishedSecrets(values) {
  const found = [];

  for (const [name, value] of Object.entries(values)) {
    if (!value) continue;
    if (PUBLISHED.get(fingerprint(value)) === name) found.push(name);
  }

  return found;
}

/**
 * Throws in production when any secret is still the committed one.
 *
 * Deliberately fatal rather than a warning. A warning scrolls past in a
 * deploy log and the server starts anyway, which is the same outcome as not
 * checking. Refusing to boot is the only version of this that works.
 */
export function assertSecretsAreNotPublic(values, { isProduction }) {
  if (!isProduction) return;

  const exposed = findPublishedSecrets(values);
  if (!exposed.length) return;

  throw new Error(
    `Refusing to start: ${exposed.join(', ')} ${exposed.length === 1 ? 'is' : 'are'} still set to ` +
      'a value exposed in this repository history. Generate replacements ' +
      "(`openssl rand -hex 48`), rotate the database password, and set them in the deployment's " +
      'own environment rather than in server/.env.',
  );
}

export const __testing = { fingerprint, PUBLISHED };
