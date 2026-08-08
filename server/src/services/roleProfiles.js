/**
 * Target-role definitions.
 *
 * A readiness number only means something relative to a goal — 65% is strong
 * for a data analyst and weak for a backend engineer. Selecting a role turns
 * the dashboard from a report card into a gap list.
 */
export const ROLE_PROFILES = [
  {
    key: 'frontend',
    label: 'Frontend Developer',
    icon: 'web',
    required: ['JavaScript', 'React', 'HTML', 'CSS', 'Git'],
    preferred: ['TypeScript', 'Testing', 'Next.js'],
    /** Roughly how many problems a candidate for this role is expected to have solved. */
    codingTarget: 60,
  },
  {
    key: 'backend',
    label: 'Backend Developer',
    icon: 'dns',
    required: ['Node.js', 'Express', 'SQL', 'REST APIs', 'Git'],
    preferred: ['MongoDB', 'Docker', 'System Design'],
    codingTarget: 90,
  },
  {
    key: 'fullstack',
    label: 'Full Stack Developer',
    icon: 'layers',
    required: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'],
    preferred: ['TypeScript', 'Docker', 'REST APIs'],
    codingTarget: 90,
  },
  {
    key: 'data-analyst',
    label: 'Data Analyst',
    icon: 'insights',
    required: ['SQL', 'Python', 'Pandas', 'DBMS'],
    preferred: ['Machine Learning', 'R'],
    codingTarget: 40,
  },
  {
    key: 'software-engineer',
    label: 'Software Engineer',
    icon: 'terminal',
    required: ['Data Structures', 'OOP', 'DBMS', 'Operating Systems', 'Git'],
    preferred: ['System Design', 'Networking'],
    codingTarget: 120,
  },
];

export const roleByKey = (key) => ROLE_PROFILES.find((role) => role.key === key) ?? null;
