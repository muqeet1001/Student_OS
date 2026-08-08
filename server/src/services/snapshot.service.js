import { ReadinessSnapshot } from '../models/ReadinessSnapshot.js';

/** Midnight UTC, so a snapshot is keyed to a day rather than a moment. */
export function today() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Records today's readiness for one student.
 *
 * Called opportunistically when the dashboard loads rather than from a cron:
 * a student who never opens the app has no progress worth charting, and this
 * keeps the feature working without scheduling infrastructure.
 *
 * Upserted on (user, day), so repeated dashboard loads refine the same row
 * instead of creating dozens.
 */
export async function recordSnapshot(userId, { score, components, totals }) {
  const flat = Object.fromEntries(components.map((part) => [part.key, part.value]));

  await ReadinessSnapshot.findOneAndUpdate(
    { user: userId, day: today() },
    { score, components: flat, totals },
    { upsert: true, setDefaultsOnInsert: true },
  ).catch(() => {
    // A failed snapshot must never break the dashboard it was taken from.
  });
}

/** Snapshots for the last `days`, oldest first. */
export async function readHistory(userId, days = 90) {
  const from = new Date(Date.now() - days * 86_400_000);

  return ReadinessSnapshot.find({ user: userId, day: { $gte: from } })
    .select('day score components totals')
    .sort({ day: 1 })
    .lean();
}
