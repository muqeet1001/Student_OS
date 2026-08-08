/**
 * Notifications are derived from the student's own data on read, not stored
 * as a feed. There is no external event source, so a persisted feed would
 * only be a stale copy of state we can already compute — and it could tell a
 * student to do something they have already done.
 *
 * Each notice must be actionable: it names one thing to do and where.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ordered most urgent first; the UI shows them in this order. */
export function buildNotifications({ profile, coding, tests, interviews, readiness }) {
  const notices = [];
  const now = Date.now();

  // --- Streak at risk -------------------------------------------------
  const lastSolved = coding.streak.lastSolvedAt ? new Date(coding.streak.lastSolvedAt) : null;
  if (coding.streak.current > 0 && lastSolved) {
    const hoursIdle = (now - lastSolved.getTime()) / (60 * 60 * 1000);
    if (hoursIdle >= 20) {
      notices.push({
        id: 'streak-at-risk',
        tone: 'warning',
        icon: 'local_fire_department',
        title: `Your ${coding.streak.current}-day streak ends today`,
        body: 'Solve one problem to keep it alive.',
        action: { label: 'Solve a problem', to: '/coding-practice' },
      });
    }
  }

  // --- Unfinished work ------------------------------------------------
  if (interviews.activeSessionId) {
    notices.push({
      id: 'interview-in-progress',
      tone: 'info',
      icon: 'forum',
      title: 'You have an interview in progress',
      body: 'Pick up where you left off.',
      action: { label: 'Resume', to: `/ai-interview/session/${interviews.activeSessionId}` },
    });
  }

  // --- Profile gaps ---------------------------------------------------
  if ((profile?.completeness ?? 0) < 70) {
    notices.push({
      id: 'profile-incomplete',
      tone: 'info',
      icon: 'person',
      title: `Your profile is ${profile?.completeness ?? 0}% complete`,
      body: 'Recruiters filter on skills and projects — a thin profile gets skipped.',
      action: { label: 'Complete profile', to: '/profile' },
    });
  }

  if ((profile?.projects?.length ?? 0) < 2) {
    notices.push({
      id: 'needs-projects',
      tone: 'info',
      icon: 'folder_special',
      title: 'Add a second project',
      body: 'Projects are the strongest signal on a student resume.',
      action: { label: 'Add a project', to: '/profile' },
    });
  }

  // --- Verification ---------------------------------------------------
  const unverified = (profile?.skills ?? []).filter((skill) => !skill.verified).length;
  if (unverified >= 3 && tests.taken === 0) {
    notices.push({
      id: 'verify-skills',
      tone: 'info',
      icon: 'verified',
      title: `${unverified} skills are unverified`,
      body: 'Passing a skill test marks them as verified on your profile.',
      action: { label: 'Take a test', to: '/skill-test' },
    });
  }

  // --- Untouched areas ------------------------------------------------
  if (interviews.completed === 0) {
    notices.push({
      id: 'never-interviewed',
      tone: 'info',
      icon: 'record_voice_over',
      title: 'You have not practised an interview yet',
      body: 'A behavioural round takes about ten minutes.',
      action: { label: 'Start a round', to: '/ai-interview' },
    });
  }

  // --- Weakest area ---------------------------------------------------
  const weakest = readiness.components.find((part) => part.key === readiness.weakest);
  if (weakest && weakest.value < 50) {
    /*
     * Keyed by readiness component. These keys drifted once already: the map
     * still said `profile` and `tests` after the components were renamed to
     * `skills`/`resume` and `projects` was added, so the commonest weakest
     * areas produced a notice whose button pointed at `undefined`.
     */
    const routes = {
      skills: '/skills',
      coding: '/coding-practice',
      resume: '/resume-builder',
      interview: '/ai-interview',
      projects: '/profile',
    };

    const destination = routes[weakest.key];

    // Only worth saying when it is not already covered by a notice above.
    // An unknown component is skipped rather than emitted with a broken
    // link — a nudge that goes nowhere is worse than no nudge.
    const covered = notices.some((notice) => notice.action.to === destination);
    if (destination && !covered) {
      notices.push({
        id: `weakest-${weakest.key}`,
        tone: 'info',
        icon: 'trending_up',
        title: `${weakest.label} is your weakest area at ${weakest.value}%`,
        body: 'Improving it moves your readiness score the most.',
        action: { label: `Improve ${weakest.label.toLowerCase()}`, to: routes[weakest.key] },
      });
    }
  }

  // --- Wins -----------------------------------------------------------
  if (coding.streak.current >= 7) {
    notices.push({
      id: 'streak-milestone',
      tone: 'success',
      icon: 'workspace_premium',
      title: `${coding.streak.current} day streak`,
      body: 'Consistency is doing more for you than any single session.',
      action: { label: 'Keep going', to: '/coding-practice' },
    });
  }

  const recentPass = tests.recent?.find(
    (attempt) => attempt.passed && now - new Date(attempt.submittedAt).getTime() < 3 * DAY_MS,
  );
  if (recentPass) {
    notices.push({
      id: `passed-${recentPass._id}`,
      tone: 'success',
      icon: 'check_circle',
      title: `You passed ${recentPass.test?.title ?? 'a test'}`,
      body: 'The related skills are now verified on your profile.',
      action: { label: 'View profile', to: '/profile' },
    });
  }

  return notices;
}
