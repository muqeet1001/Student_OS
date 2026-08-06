/** Single source of truth for the sidebar and the mobile bottom bar. */
export const navLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', short: 'Home' },
  { label: 'Coding Practice', path: '/coding-practice', icon: 'code', short: 'Code' },
  { label: 'Skill Test', path: '/skill-test', icon: 'quiz', short: 'Tests' },
  { label: 'PYQ Library', path: '/pyq-library', icon: 'history_edu', short: 'PYQs' },
  { label: 'Resume Builder', path: '/resume-builder', icon: 'description', short: 'Resume' },
  { label: 'AI Interview', path: '/ai-interview', icon: 'psychology', short: 'Interview' },
  { label: 'Profile', path: '/profile', icon: 'person', short: 'Profile' },
];

/** The bottom bar only has room for the five most-used destinations. */
export const mobileLinks = navLinks.filter((link) =>
  ['/dashboard', '/coding-practice', '/skill-test', '/pyq-library', '/profile'].includes(link.path),
);
