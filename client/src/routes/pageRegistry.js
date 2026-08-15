/** Single source of truth for the sidebar and the mobile bottom bar. */
export const navLinks = [
  { label: 'Home', path: '/dashboard', icon: 'dashboard', short: 'Home' },
  { label: 'My Plan', path: '/my-plan', icon: 'map', short: 'Plan' },
  { label: 'Practice', path: '/practice', icon: 'school', short: 'Practice' },
  { label: 'Opportunities', path: '/opportunities', icon: 'work', short: 'Jobs' },
  { label: 'Profile & Resume', path: '/career-profile', icon: 'person', short: 'Profile' },
  { label: 'Updates', path: '/updates', icon: 'campaign', short: 'Updates' },
];

/** Shown only to admins, appended after the student links. */
export const adminLinks = [
  { label: 'Placement Office', path: '/admin', icon: 'groups', short: 'Office' },
];

/** The bottom bar only has room for the five most-used destinations. */
export const mobileLinks = navLinks.filter((link) =>
  ['/dashboard', '/my-plan', '/practice', '/opportunities', '/updates'].includes(link.path),
);
