/**
 * Turns readiness gaps into a short list of things to do today.
 *
 * The dashboard's job is to answer "what should I do next?", and a list of
 * percentages does not. Tasks are generated from the weakest signals, capped
 * at four so the list stays doable rather than becoming a backlog, and each
 * one names where it leads.
 */

const MAX_TASKS = 4;

/**
 * @param {object} input Readiness components plus the raw signals behind them.
 * @returns {{tasks: Array, completed: number, total: number}}
 */
export function buildTodayPlan({ components, coding, tests, interviews, profile, roleMatch }) {
  const candidates = [];
  const by = (key) => components.find((part) => part.key === key)?.value ?? 0;

  // Missing skills for the chosen role are the most specific thing a student
  // can act on, so they lead.
  if (roleMatch?.missing?.length) {
    const [first] = roleMatch.missing;
    candidates.push({
      id: `verify-${first}`,
      weight: 100 - by('skills'),
      label: `Take the ${first} skill assessment`,
      hint: `${roleMatch.role.label} roles expect it`,
      to: '/skill-test',
      done: false,
    });
  }

  if (coding.totalSolved < (roleMatch?.role?.codingTarget ?? 60)) {
    const solvedToday = coding.streak?.lastSolvedAt
      ? new Date(coding.streak.lastSolvedAt).toDateString() === new Date().toDateString()
      : false;

    candidates.push({
      id: 'solve-problems',
      weight: 100 - by('coding'),
      label: 'Solve 3 DSA problems',
      hint: solvedToday ? 'Started today — keep going' : 'Keeps your streak alive',
      to: '/coding-practice',
      done: solvedToday,
    });
  }

  if (by('resume') < 85) {
    candidates.push({
      id: 'improve-resume',
      weight: 100 - by('resume'),
      label: 'Improve your resume',
      hint: `ATS score is ${by('resume')}`,
      to: '/resume-builder',
      done: false,
    });
  }

  if (interviews.completed === 0 || by('interview') < 70) {
    candidates.push({
      id: 'mock-interview',
      weight: 100 - by('interview'),
      label: 'Complete 1 AI mock interview',
      hint: interviews.completed === 0 ? 'You have not tried one yet' : 'Your weakest signal',
      to: '/ai-interview',
      done: false,
    });
  }

  if ((profile?.projects?.length ?? 0) < 2) {
    candidates.push({
      id: 'add-project',
      weight: 100 - by('projects'),
      label: 'Add a project to your profile',
      hint: 'The strongest signal on a student resume',
      to: '/profile',
      done: false,
    });
  }

  if (tests.taken === 0) {
    candidates.push({
      id: 'first-test',
      weight: 90,
      label: 'Take your first skill test',
      hint: 'Verifies a skill on your profile',
      to: '/skill-test',
      done: false,
    });
  }

  // Weakest area first, so the plan always targets the biggest gain.
  const tasks = candidates.sort((a, b) => b.weight - a.weight).slice(0, MAX_TASKS);

  return {
    tasks,
    completed: tasks.filter((task) => task.done).length,
    total: tasks.length,
  };
}

/**
 * Longer-form advice shown beneath the plan. Each item states the problem in
 * the student's own numbers and links to the one screen that fixes it.
 */
export function buildRecommendations({ components, coding, interviews, roleMatch, atsReport }) {
  const out = [];
  const by = (key) => components.find((part) => part.key === key)?.value ?? 0;

  if (roleMatch?.missing?.length) {
    out.push({
      id: 'role-gap',
      icon: 'target',
      text: `${roleMatch.missing.slice(0, 3).join(', ')} ${
        roleMatch.missing.length === 1 ? 'is' : 'are'
      } expected for ${roleMatch.role.label} and missing from your profile.`,
      action: { label: 'Verify a skill', to: '/skill-test' },
    });
  }

  const failedAts = (atsReport?.checks ?? []).filter((check) => !check.passed);
  if (failedAts.length > 0) {
    out.push({
      id: 'ats-gap',
      icon: 'description',
      text: failedAts[0].fix ?? 'Your resume has gaps an ATS will penalise.',
      action: { label: 'Improve resume', to: '/resume-builder' },
    });
  }

  if (interviews.completed > 0 && by('interview') < by('coding')) {
    out.push({
      id: 'interview-below-coding',
      icon: 'record_voice_over',
      text: `Your interview score (${by('interview')}%) is below your coding score (${by(
        'coding',
      )}%). Explaining your work is a separate skill from doing it.`,
      action: { label: 'Practise an interview', to: '/ai-interview' },
    });
  }

  if (coding.solved?.hard === 0 && coding.totalSolved >= 10) {
    out.push({
      id: 'no-hard-problems',
      icon: 'trending_up',
      text: 'You have not solved a hard problem yet. Product companies weight them heavily.',
      action: { label: 'Try a hard problem', to: '/coding-practice' },
    });
  }

  return out.slice(0, 4);
}
