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
  { label: 'Today', path: '/admin/overview', icon: 'space_dashboard', short: 'Today', group: 'Workspace' },
  { label: 'Students', path: '/admin/students', icon: 'groups', short: 'Students', group: 'Workspace' },
  { label: 'Interventions', path: '/admin/interventions', icon: 'support_agent', short: 'Support', group: 'Workspace' },
  { label: 'Tasks', path: '/admin/tasks', icon: 'task_alt', short: 'Tasks', group: 'Workspace' },
  { label: 'Companies', path: '/admin/companies', icon: 'domain', short: 'Companies', group: 'Recruitment' },
  { label: 'Drives', path: '/admin/drives', icon: 'business_center', short: 'Drives', group: 'Recruitment' },
  { label: 'Matching', path: '/admin/matching', icon: 'person_search', short: 'Match', group: 'Recruitment' },
  { label: 'Calendar', path: '/admin/calendar', icon: 'calendar_month', short: 'Calendar', group: 'Operations' },
  { label: 'Reviews', path: '/admin/reviews', icon: 'rate_review', short: 'Reviews', group: 'Operations' },
  { label: 'Communications', path: '/admin/communications', icon: 'campaign', short: 'Updates', group: 'Operations' },
  { label: 'Training', path: '/admin/training', icon: 'school', short: 'Training', group: 'Intelligence' },
  { label: 'Outcomes', path: '/admin/outcomes', icon: 'monitoring', short: 'Outcomes', group: 'Intelligence' },
  { label: 'Settings', path: '/admin/settings', icon: 'tune', short: 'Settings', group: 'System' },
  { label: 'Activity', path: '/admin/activity', icon: 'history', short: 'Activity', group: 'System' },
];

/** The bottom bar only has room for the five most-used destinations. */
export const mobileLinks = navLinks.filter((link) =>
  ['/dashboard', '/readiness', '/my-plan', '/practice', '/opportunities'].includes(link.path),
);
