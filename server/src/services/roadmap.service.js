/**
 * A four-week plan generated from the student's actual gaps.
 *
 * The important design choice: every task reports completion from real
 * evidence — a verified skill, a solved count, a submitted interview — never
 * from a checkbox. A roadmap you can tick without doing the work measures
 * nothing, and a student who games it only fools themselves.
 *
 * Tasks are ordered so the weeks build: verification first because it feeds
 * every downstream match, then volume practice, then presentation, then
 * rehearsal.
 */

const WEEK_THEMES = [
  { week: 1, theme: 'Prove what you already know' },
  { week: 2, theme: 'Build volume' },
  { week: 3, theme: 'Fix how you present it' },
  { week: 4, theme: 'Rehearse and re-measure' },
];

/**
 * @param {object} input Everything the dashboard already computed.
 * @returns {{weeks: Array, progress: {done: number, total: number, percentage: number}}}
 */
export function buildRoadmap({ components, coding, tests, interviews, resume, profile, roleMatch }) {
  const by = (key) => components.find((part) => part.key === key)?.value ?? 0;

  const skills = profile?.skills ?? [];
  const verified = skills.filter((skill) => skill.verified);
  const projects = profile?.projects ?? [];

  const codingTarget = roleMatch?.role?.codingTarget ?? 60;
  const solved = coding.totalSolved;

  // Milestones are set relative to where the student is now, so a strong
  // student is not handed a target they passed weeks ago.
  const weeklySolveTarget = Math.max(5, Math.ceil((codingTarget - solved) / 3));

  const weeks = [
    {
      ...WEEK_THEMES[0],
      tasks: [
        {
          id: 'verify-first',
          label: roleMatch?.missing?.length
            ? `Take the ${roleMatch.missing[0]} assessment`
            : 'Verify a skill with an assessment',
          why: 'Verified skills outrank self-declared ones in every shortlist.',
          to: '/skills',
          done: verified.length >= 1,
          progress: `${verified.length} verified`,
        },
        {
          id: 'verify-three',
          label: 'Get three skills verified',
          why: 'Most job requirements name three to five skills.',
          to: '/skills',
          done: verified.length >= 3,
          progress: `${verified.length}/3`,
        },
        {
          id: 'pick-role',
          label: 'Choose a target role',
          why: 'Readiness against no goal cannot tell you what to fix.',
          to: '/dashboard',
          done: Boolean(roleMatch),
          progress: roleMatch ? roleMatch.role.label : 'not set',
        },
      ],
    },
    {
      ...WEEK_THEMES[1],
      tasks: [
        {
          id: 'solve-week',
          label: `Solve ${weeklySolveTarget} problems`,
          why: 'Coding is the heaviest weighted signal and the slowest to move.',
          to: '/coding-practice',
          done: solved >= Math.min(codingTarget, weeklySolveTarget),
          progress: `${solved} solved`,
        },
        {
          id: 'first-hard',
          label: 'Solve your first hard problem',
          why: 'Product companies weight them heavily.',
          to: '/coding-practice',
          done: coding.solved.hard > 0,
          progress: `${coding.solved.hard} hard`,
        },
        {
          id: 'take-test',
          label: 'Take a skill test',
          why: 'Passing marks the related skills as verified on your profile.',
          to: '/skill-test',
          done: tests.taken > 0,
          progress: `${tests.taken} taken`,
        },
      ],
    },
    {
      ...WEEK_THEMES[2],
      tasks: [
        {
          id: 'two-projects',
          label: 'Have two projects on your profile',
          why: 'Projects are the strongest signal on a student resume.',
          to: '/profile',
          done: projects.length >= 2,
          progress: `${projects.length}/2`,
        },
        {
          id: 'ats-70',
          label: 'Get your ATS score above 70',
          why: 'Below that, automated filters drop the resume before a human sees it.',
          to: '/resume-builder',
          done: resume.atsScore >= 70,
          progress: `${resume.atsScore}/100`,
        },
        {
          id: 'quantify',
          label: 'Quantify at least one project result',
          why: '"Cut load time by 40%" beats "improved performance".',
          to: '/profile',
          done: (resume.checks ?? []).find((c) => /Quantified/i.test(c.label))?.passed ?? false,
          progress: null,
        },
      ],
    },
    {
      ...WEEK_THEMES[3],
      tasks: [
        {
          id: 'first-interview',
          label: 'Complete a mock interview',
          why: 'Explaining your work is a separate skill from doing it.',
          to: '/ai-interview',
          done: interviews.completed >= 1,
          progress: `${interviews.completed} completed`,
        },
        {
          id: 'interview-70',
          label: 'Reach 70% on an interview',
          why: 'That is roughly the bar where answers stop losing you the round.',
          to: '/ai-interview',
          done: by('interview') >= 70,
          progress: `${by('interview')}%`,
        },
        {
          id: 'apply',
          label: 'Apply to a role you match',
          why: 'The point of all of the above.',
          to: '/jobs',
          done: false,
          progress: null,
          /** Cannot be derived from the dashboard payload; the tracker owns it. */
          derivedFrom: 'applications',
        },
      ],
    },
  ];

  const all = weeks.flatMap((week) => week.tasks);
  const done = all.filter((task) => task.done).length;

  return {
    weeks: weeks.map((week) => ({
      ...week,
      done: week.tasks.filter((task) => task.done).length,
      total: week.tasks.length,
      // The current week is the first with unfinished work, so the plan
      // always points at one place rather than everywhere at once.
      complete: week.tasks.every((task) => task.done),
    })),
    progress: {
      done,
      total: all.length,
      percentage: all.length ? Math.round((done / all.length) * 100) : 0,
    },
  };
}
