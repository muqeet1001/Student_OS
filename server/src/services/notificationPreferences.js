/**
 * Which notices a student wants to see.
 *
 * Notifications are derived on read rather than stored, so preferences are
 * applied at derivation in one place. Doing it in the client instead would
 * let the badge count disagree with the list under it.
 */

/**
 * Notice ids grouped into the categories a student can actually reason
 * about. Grouping by "what this is about" rather than by which function
 * emitted it, because nobody wants to toggle seven individual notices.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    key: 'streak',
    label: 'Streaks',
    description: 'When your practice streak is about to end, and when you hit a milestone.',
    notices: ['streak-at-risk', 'streak-milestone'],
  },
  {
    key: 'unfinished',
    label: 'Unfinished work',
    description: 'Interviews and tests you started and did not submit.',
    notices: ['interview-in-progress'],
  },
  {
    key: 'profile',
    label: 'Profile gaps',
    description: 'Missing projects, thin profile, anything a recruiter would filter on.',
    notices: ['profile-incomplete', 'needs-projects'],
  },
  {
    key: 'practice',
    label: 'Practice nudges',
    description: 'Skills you have never verified, interviews you have never attempted.',
    notices: ['verify-skills', 'never-interviewed'],
  },
];

export const CATEGORY_KEYS = NOTIFICATION_CATEGORIES.map((category) => category.key);

/** Notice id → category key, built once. */
const CATEGORY_OF = new Map(
  NOTIFICATION_CATEGORIES.flatMap((category) =>
    category.notices.map((notice) => [notice, category.key]),
  ),
);

/** Everything on, which is what a new account gets. */
export function defaultPreferences() {
  return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, true]));
}

/**
 * Filters derived notices against a student's preferences.
 *
 * Fails open twice over, and both matter:
 *
 * A notice whose id belongs to no category is shown. Otherwise adding a new
 * notification type would make it invisible to every existing student until
 * someone remembered to add it to a category here — a silent failure that
 * would take a long time to notice.
 *
 * A category absent from the stored preferences is treated as on, so
 * introducing a new category does not require backfilling every user.
 */
export function filterNotifications(notices, preferences = {}) {
  return notices.filter((notice) => {
    const category = CATEGORY_OF.get(notice.id);
    if (!category) return true;
    return preferences[category] !== false;
  });
}

/** Keeps only known categories, so an arbitrary body cannot write junk. */
export function sanitisePreferences(input = {}) {
  const clean = {};
  for (const key of CATEGORY_KEYS) {
    if (typeof input[key] === 'boolean') clean[key] = input[key];
  }
  return clean;
}
