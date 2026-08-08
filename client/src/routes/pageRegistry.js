/** Single source of truth for the sidebar and the mobile bottom bar. */
export const navLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', short: 'Home' },
  { label: 'Coding Practice', path: '/coding-practice', icon: 'code', short: 'Code' },
  { label: 'Skill Test', path: '/skill-test', icon: 'quiz', short: 'Tests' },
  { label: 'PYQ Library', path: '/pyq-library', icon: 'history_edu', short: 'PYQs' },
  { label: 'Jobs', path: '/jobs', icon: 'work', short: 'Jobs' },
  { label: 'Company Prep', path: '/company-prep', icon: 'apartment', short: 'Company' },
  { label: 'Resume Builder', path: '/resume-builder', icon: 'description', short: 'Resume' },
  { label: 'AI Interview', path: '/ai-interview', icon: 'psychology', short: 'Interview' },
  { label: 'Profile', path: '/profile', icon: 'person', short: 'Profile' },
];

/** Shown only to admins, appended after the student links. */
export const adminLinks = [
  { label: 'Students', path: '/admin', icon: 'groups', short: 'Students' },
];

/** The bottom bar only has room for the five most-used destinations. */
export const mobileLinks = navLinks.filter((link) =>
  ['/dashboard', '/jobs', '/coding-practice', '/skill-test', '/profile'].includes(link.path),
);
