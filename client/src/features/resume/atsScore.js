/**
 * Rule-based ATS heuristic.
 *
 * Deliberately transparent: every point is attributable to a named check, so
 * the panel can tell a student exactly what to change rather than showing an
 * opaque number.
 */

const ACTION_VERBS = [
  'built', 'led', 'designed', 'implemented', 'improved', 'reduced', 'increased',
  'launched', 'migrated', 'automated', 'optimized', 'shipped', 'developed',
  'created', 'architected', 'delivered', 'scaled',
];

/** A bullet that quantifies impact ("reduced load time by 30%"). */
const QUANTIFIED = /\d+\s?(%|percent|x|k\b|m\b|users?|ms\b|seconds?|hours?|days?)/i;

export function scoreResume({ profile, user }) {
  const bullets = [
    ...(profile.experience ?? []).flatMap((entry) => entry.highlights ?? []),
    ...(profile.projects ?? []).map((project) => project.description).filter(Boolean),
  ];

  const hasContact = Boolean(user?.email) && Boolean(profile.phone || profile.location);
  const linkCount = Object.values(profile.links ?? {}).filter(Boolean).length;

  const checks = [
    {
      label: 'Contact details present',
      weight: 10,
      passed: hasContact,
      fix: 'Add a phone number or location to your profile.',
    },
    {
      label: 'Professional summary written',
      weight: 12,
      passed: (profile.bio ?? '').trim().length >= 80,
      fix: 'Write a summary of at least 80 characters.',
    },
    {
      label: 'Headline set',
      weight: 6,
      passed: Boolean(profile.headline),
      fix: 'Add a headline describing the role you want.',
    },
    {
      label: 'At least 5 skills listed',
      weight: 14,
      passed: (profile.skills ?? []).length >= 5,
      fix: 'List at least five skills recruiters search for.',
    },
    {
      label: 'A skill verified by a test',
      weight: 8,
      passed: (profile.skills ?? []).some((skill) => skill.verified),
      fix: 'Pass a skill test to verify one of your skills.',
    },
    {
      label: 'Education added',
      weight: 10,
      passed: (profile.education ?? []).length >= 1,
      fix: 'Add your degree and institution.',
    },
    {
      label: 'Two or more projects',
      weight: 14,
      passed: (profile.projects ?? []).length >= 2,
      fix: 'Projects are the strongest signal on a student resume — add two.',
    },
    {
      label: 'Bullets start with action verbs',
      weight: 10,
      passed:
        bullets.length > 0 &&
        bullets.filter((bullet) =>
          ACTION_VERBS.some((verb) => bullet.trim().toLowerCase().startsWith(verb)),
        ).length >=
          Math.ceil(bullets.length / 2),
      fix: 'Start descriptions with verbs like "Built", "Led" or "Reduced".',
    },
    {
      label: 'Quantified achievements',
      weight: 10,
      passed: bullets.some((bullet) => QUANTIFIED.test(bullet)),
      fix: 'Add a number to at least one bullet, e.g. "cut load time by 30%".',
    },
    {
      label: 'GitHub or LinkedIn linked',
      weight: 6,
      passed: linkCount >= 1,
      fix: 'Add your GitHub or LinkedIn URL.',
    },
  ];

  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);

  return { score: Math.min(100, score), checks };
}
