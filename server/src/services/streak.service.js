import { Submission } from '../models/Submission.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC for a date, so a streak is counted in whole days. */
function dayKey(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Current and longest run of consecutive days with at least one accepted
 * submission. Today not yet being solved does not break the current streak —
 * only a fully missed day does.
 */
export async function computeStreak(userId) {
  const accepted = await Submission.find({ user: userId, verdict: 'accepted' })
    .select('createdAt')
    .sort({ createdAt: -1 })
    .lean();

  if (!accepted.length) {
    return { current: 0, longest: 0, activeDays: 0, lastSolvedAt: null };
  }

  const days = [...new Set(accepted.map((entry) => dayKey(new Date(entry.createdAt))))].sort(
    (a, b) => b - a,
  );

  const today = dayKey(new Date());
  let current = 0;

  // The streak is live if the most recent solve was today or yesterday.
  if (days[0] === today || days[0] === today - DAY_MS) {
    current = 1;
    for (let i = 1; i < days.length; i += 1) {
      if (days[i - 1] - days[i] !== DAY_MS) break;
      current += 1;
    }
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i - 1] - days[i] === DAY_MS) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    activeDays: days.length,
    lastSolvedAt: accepted[0].createdAt,
  };
}

/** Per-day accepted counts for the last `days` days, for the activity chart. */
export async function computeActivity(userId, days = 30) {
  const since = new Date(Date.now() - days * DAY_MS);

  const rows = await Submission.aggregate([
    { $match: { user: userId, verdict: 'accepted', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({ date: row._id, count: row.count }));
}
