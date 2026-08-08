import assert from 'node:assert/strict';
import test from 'node:test';

import { User } from '../src/models/User.js';
import { describeUserAgent } from '../src/services/userAgent.js';
import {
  CATEGORY_KEYS,
  NOTIFICATION_CATEGORIES,
  defaultPreferences,
  filterNotifications,
  sanitisePreferences,
} from '../src/services/notificationPreferences.js';
import { updateSettingsSchema } from '../src/validators/auth.validators.js';

const notice = (id) => ({ id, title: id });

test('a new account has every notification category on', () => {
  const defaults = defaultPreferences();

  assert.deepEqual(Object.keys(defaults).sort(), [...CATEGORY_KEYS].sort());
  assert.ok(Object.values(defaults).every((value) => value === true));
});

test('turning a category off hides every notice in it', () => {
  const notices = [notice('streak-at-risk'), notice('streak-milestone'), notice('needs-projects')];

  const kept = filterNotifications(notices, { streak: false });

  assert.deepEqual(
    kept.map((entry) => entry.id),
    ['needs-projects'],
    'both streak notices go, since the student turned off the group',
  );
});

test('turning one category off leaves the others alone', () => {
  const notices = [notice('profile-incomplete'), notice('verify-skills'), notice('streak-at-risk')];

  assert.equal(filterNotifications(notices, { profile: false }).length, 2);
});

/**
 * The failure this prevents: adding a new notification type and having it be
 * invisible to every existing student until someone remembers to categorise
 * it. A silent failure nobody would find for months.
 */
test('a notice belonging to no category is shown rather than swallowed', () => {
  const kept = filterNotifications([notice('brand-new-notice-type')], {
    streak: false,
    profile: false,
    practice: false,
    unfinished: false,
  });

  assert.equal(kept.length, 1, 'unknown ids fail open');
});

test('a category the student has never touched is treated as on', () => {
  // Preferences are stored sparsely, so introducing a category must not
  // require backfilling every existing user.
  const kept = filterNotifications([notice('streak-at-risk')], { profile: false });

  assert.equal(kept.length, 1);
});

test('empty preferences show everything', () => {
  const notices = CATEGORY_KEYS.flatMap((key) =>
    NOTIFICATION_CATEGORIES.find((category) => category.key === key).notices.map(notice),
  );

  assert.equal(filterNotifications(notices, {}).length, notices.length);
  assert.equal(filterNotifications(notices).length, notices.length, 'and undefined preferences');
});

test('turning everything off leaves nothing categorised behind', () => {
  const notices = NOTIFICATION_CATEGORIES.flatMap((category) => category.notices.map(notice));
  const allOff = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, false]));

  assert.deepEqual(filterNotifications(notices, allOff), []);
});

test('unknown preference keys are dropped rather than written to the document', () => {
  const clean = sanitisePreferences({
    streak: false,
    isAdmin: true,
    'constructor.prototype.polluted': true,
    profile: 'yes',
  });

  assert.deepEqual(clean, { streak: false }, 'only known boolean categories survive');
});

test('the settings validator accepts a preference body and rejects a non-boolean', () => {
  assert.equal(updateSettingsSchema.safeParse({ notifications: { streak: false } }).success, true);
  assert.equal(updateSettingsSchema.safeParse({ notifications: { streak: 'no' } }).success, false);
  assert.equal(updateSettingsSchema.safeParse({}).success, true, 'an empty body is a no-op');
});

test('every notice the service emits belongs to exactly one category', () => {
  // Guards the categories drifting out of sync with notifications.service.js.
  const seen = new Map();

  for (const category of NOTIFICATION_CATEGORIES) {
    for (const id of category.notices) {
      assert.equal(seen.has(id), false, `${id} is in two categories`);
      seen.set(id, category.key);
    }
  }

  const emitted = [
    'streak-at-risk',
    'interview-in-progress',
    'profile-incomplete',
    'needs-projects',
    'verify-skills',
    'never-interviewed',
    'streak-milestone',
  ];

  for (const id of emitted) {
    assert.ok(seen.has(id), `${id} is emitted but categorised nowhere, so it cannot be turned off`);
  }
});

test('category keys are unique and each carries a label and description', () => {
  assert.equal(new Set(CATEGORY_KEYS).size, CATEGORY_KEYS.length);

  for (const category of NOTIFICATION_CATEGORIES) {
    assert.ok(category.label);
    assert.ok(category.description, `${category.key} needs to explain what it turns off`);
    assert.ok(category.notices.length > 0);
  }
});

/**
 * Order matters in the UA table: Edge advertises Chrome, Chrome advertises
 * Safari, and everything advertises Mozilla.
 */
test('common browsers are named correctly despite advertising each other', () => {
  const cases = [
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Chrome on Windows',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0',
      'Edge on Windows',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Safari on Mac',
    ],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', 'Firefox on Windows'],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Safari on iPhone',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
      'Chrome on iPhone',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
      'Chrome on Android',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36',
      'Samsung Internet on Android',
    ],
  ];

  for (const [ua, expected] of cases) {
    assert.equal(describeUserAgent(ua), expected, ua.slice(0, 50));
  }
});

test('an iPhone is not reported as a Mac, despite saying "like Mac OS X"', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1';

  assert.match(describeUserAgent(ua), /iPhone/);
});

test('an unrecognised agent is shown truncated rather than hidden as "Unknown"', () => {
  // An unrecognised session is exactly the one worth looking at, so showing
  // something is more useful than showing nothing.
  const described = describeUserAgent('SomeInternalScanner/2.1 (build 9931; internal use only)');

  assert.match(described, /SomeInternalScanner/);
  assert.ok(described.length <= 41);
});

test('a missing user agent reads as an unknown device rather than blank', () => {
  assert.equal(describeUserAgent(''), 'Unknown device');
  assert.equal(describeUserAgent(null), 'Unknown device');
  assert.equal(describeUserAgent(undefined), 'Unknown device');
});

test('a curl session is reported rather than silently unlabelled', () => {
  assert.match(describeUserAgent('curl/8.4.0'), /curl/);
});

test('notification settings default to an empty map on a new user', () => {
  const user = new User({ name: 'Asha', email: 'asha@example.com', password: 'password123' });

  assert.equal(user.settings.notifications.size, 0, 'stored sparsely, not pre-filled');
  assert.equal(user.validateSync(), undefined);
});

test('settings survive a round trip through the document', () => {
  const user = new User({ name: 'Asha', email: 'asha@example.com', password: 'password123' });

  user.settings.notifications.set('streak', false);

  assert.equal(user.settings.notifications.get('streak'), false);
  assert.deepEqual(Object.fromEntries(user.settings.notifications), { streak: false });
});

test('the serialised user never carries the password or refresh tokens', () => {
  // Settings are safe to expose; credentials are not, and this endpoint is
  // now returning the user in more places than before.
  const user = new User({ name: 'Asha', email: 'asha@example.com', password: 'password123' });
  const json = user.toJSON();

  assert.equal(json.password, undefined);
  assert.equal(json.refreshTokens, undefined);
  assert.ok(json.settings, 'but settings do come through');
});
