/** Single source of truth for the sidebar and the mobile bottom bar. */
export const navLinks = [
  { label: 'Home', path: '/dashboard', icon: 'dashboard', short: 'Home' },
  { label: 'Readiness', path: '/readiness', icon: 'speed', short: 'Ready' },
  { label: 'My Plan', path: '/my-plan', icon: 'map', short: 'Plan' },
  { label: 'Practice', path: '/practice', icon: 'school', short: 'Practice' },
  { label: 'Opportunities', path: '/opportunities', icon: 'work', short: 'Jobs' },
  { label: 'Profile & Resume', path: '/career-profile', icon: 'person', short: 'Profile' },
  { label: 'Updates', path: '/updates', icon: 'campaign', short: 'Updates' },
];

/** Shown only to admins, appended after the student links. */
export const adminLinks = [
  { label: 'Overview', path: '/admin/overview', icon: 'space_dashboard', short: 'Today', group: 'Workspace' },
  { label: 'Students', path: '/admin/students', icon: 'groups', short: 'Students', group: 'Workspace' },
  { label: 'Drives', path: '/admin/drives', icon: 'business_center', short: 'Drives', group: 'Recruitment' },
  { label: 'Companies', path: '/admin/companies', icon: 'domain', short: 'Companies', group: 'Recruitment' },
  { label: 'Action Centre', path: '/admin/actions', icon: 'task_alt', short: 'Actions', group: 'Operations' },
  { label: 'Calendar', path: '/admin/calendar', icon: 'calendar_month', short: 'Calendar', group: 'Operations' },
  { label: 'Communications', path: '/admin/communications', icon: 'campaign', short: 'Updates', group: 'Operations' },
  { label: 'Training', path: '/admin/training', icon: 'school', short: 'Training', group: 'Development' },
  { label: 'Reports', path: '/admin/reports', icon: 'monitoring', short: 'Reports', group: 'Intelligence' },
  { label: 'Settings', path: '/admin/settings', icon: 'tune', short: 'Settings', group: 'System' },
];

/** The bottom bar only has room for the five most-used destinations. */
export const mobileLinks = navLinks.filter((link) =>
  ['/dashboard', '/readiness', '/my-plan', '/practice', '/opportunities'].includes(link.path),
);
