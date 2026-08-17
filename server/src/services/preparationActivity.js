const DAY_MS = 86_400_000;

export function utcDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function dayNumber(day) {
  return Date.parse(`${day}T00:00:00.000Z`) / DAY_MS;
}

/**
 * Collapses preparation evidence into GitHub-style calendar days and derives
 * streaks from distinct active days. A contribution is meaningful completed
 * work, never a page view or a button click.
 */
export function summarisePreparationActivity(events, today = new Date()) {
  const days = new Map();

  for (const event of events) {
    if (!event?.at || !event?.type) continue;
    const date = utcDay(event.at);
    const row = days.get(date) ?? {
      date,
      count: 0,
      coding: 0,
      assessments: 0,
      interviews: 0,
      applications: 0,
    };
    row.count += 1;
    row[event.type] += 1;
    days.set(date, row);
  }

  const activity = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const numbers = activity.map((row) => dayNumber(row.date));
  const todayNumber = dayNumber(utcDay(today));

  let longest = numbers.length ? 1 : 0;
  let run = numbers.length ? 1 : 0;
  for (let index = 1; index < numbers.length; index += 1) {
    if (numbers[index] === numbers[index - 1] + 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  if (numbers.length && numbers.at(-1) >= todayNumber - 1) {
    current = 1;
    for (let index = numbers.length - 1; index > 0; index -= 1) {
      if (numbers[index] !== numbers[index - 1] + 1) break;
      current += 1;
    }
  }

  return {
    activity,
    currentStreak: current,
    longestStreak: Math.max(longest, current),
    activeDays: activity.length,
    totalContributions: activity.reduce((sum, row) => sum + row.count, 0),
  };
}
