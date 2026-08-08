/**
 * College-wide analysis over a loaded cohort.
 *
 * The point is not to display more numbers. A placement office already knows
 * it has weak students; what it cannot see is *which* weakness is systemic,
 * and therefore which training programme is worth running for how many
 * people. Every recommendation here names an affected count so it can be
 * argued for with a budget holder.
 */
import { canonicalise } from './skillTaxonomy.js';
import { ROLE_PROFILES } from './roleProfiles.js';

const BANDS = [
  { key: 'ready', label: 'Ready', min: 75 },
  { key: 'progressing', label: 'Progressing', min: 45 },
  { key: 'at-risk', label: 'At risk', min: 0 },
];

/** Skills worth reporting on: those any target role actually expects. */
const TRACKED_SKILLS = [
  ...new Set(ROLE_PROFILES.flatMap((role) => [...role.required, ...role.preferred])),
];

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

export function analyseCohort(cohort) {
  const total = cohort.length;

  if (total === 0) {
    return {
      totals: { students: 0, ready: 0, progressing: 0, atRisk: 0, averageReadiness: 0 },
      averages: { skills: 0, coding: 0, tests: 0, interview: 0 },
      bands: BANDS.map((band) => ({ ...band, count: 0, percentage: 0 })),
      skills: [],
      departments: [],
      recommendations: [],
    };
  }

  const mean = (pick) => Math.round(cohort.reduce((sum, row) => sum + pick(row), 0) / total);

  const bands = BANDS.map((band) => {
    const count = cohort.filter((row) => row.band === band.key).length;
    return { ...band, count, percentage: pct(count, total) };
  });

  // --- skill distribution -------------------------------------------------
  const skills = TRACKED_SKILLS.map((skill) => {
    let verified = 0;
    let declared = 0;

    for (const student of cohort) {
      const held = (student.profile?.skills ?? []).find(
        (item) => canonicalise(item.name) === skill,
      );
      if (!held) continue;

      declared += 1;
      if (held.verified) verified += 1;
    }

    return {
      skill,
      verified,
      declared,
      // The gap that matters: students who claim it but have never proved it.
      unproven: declared - verified,
      missing: total - declared,
      verifiedPercentage: pct(verified, total),
      coveragePercentage: pct(declared, total),
    };
  }).sort((a, b) => b.declared - a.declared);

  // --- department breakdown ----------------------------------------------
  const byBranch = new Map();
  for (const student of cohort) {
    const branch = student.branch || 'Unspecified';
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch).push(student);
  }

  const departments = [...byBranch.entries()]
    .map(([branch, students]) => ({
      branch,
      students: students.length,
      averageReadiness: Math.round(
        students.reduce((sum, row) => sum + row.readiness, 0) / students.length,
      ),
      ready: students.filter((row) => row.band === 'ready').length,
      atRisk: students.filter((row) => row.band === 'at-risk').length,
    }))
    .sort((a, b) => b.averageReadiness - a.averageReadiness);

  const averages = {
    skills: mean((row) => row.components.profile ?? 0),
    coding: mean((row) => row.components.coding ?? 0),
    tests: mean((row) => row.components.tests ?? 0),
    interview: mean((row) => row.components.interview ?? 0),
  };

  return {
    totals: {
      students: total,
      ready: bands.find((b) => b.key === 'ready').count,
      progressing: bands.find((b) => b.key === 'progressing').count,
      atRisk: bands.find((b) => b.key === 'at-risk').count,
      averageReadiness: mean((row) => row.readiness),
    },
    averages,
    bands,
    skills: skills.filter((item) => item.declared > 0 || item.missing < total),
    departments,
    recommendations: recommendTraining(cohort, { total, averages, skills }),
  };
}

/**
 * Turns the distribution into programmes worth running.
 *
 * Each recommendation carries the number of students it would serve — a
 * training budget is argued in headcount, not percentages.
 */
function recommendTraining(cohort, { total, averages, skills }) {
  const out = [];
  const share = (predicate) => cohort.filter(predicate).length;

  const weakCoding = share((row) => (row.components.coding ?? 0) < 40);
  if (weakCoding / total > 0.4) {
    out.push({
      id: 'dsa-bootcamp',
      title: 'Run a DSA bootcamp',
      reason: `${pct(weakCoding, total)}% of students have solved almost nothing.`,
      affected: weakCoding,
      priority: 'high',
      action: 'Coding practice is the heaviest weighted signal and the slowest to move.',
    });
  }

  const noInterview = share((row) => row.interviewsCompleted === 0);
  if (noInterview / total > 0.3) {
    out.push({
      id: 'interview-workshop',
      title: 'Run a mock interview workshop',
      reason: `${noInterview} students have never completed a single practice interview.`,
      affected: noInterview,
      priority: averages.interview < 50 ? 'high' : 'medium',
      action: 'Explaining your work is a separate skill from doing it, and it is trainable.',
    });
  }

  const noTests = share((row) => row.testsTaken === 0);
  if (noTests / total > 0.3) {
    out.push({
      id: 'verification-drive',
      title: 'Run a skill verification drive',
      reason: `${noTests} students have unverified skills only.`,
      affected: noTests,
      priority: 'medium',
      action: 'Recruiters discount self-declared skills; verified ones survive a shortlist filter.',
    });
  }

  const thinProfile = share((row) => (row.profile?.projects?.length ?? 0) < 2);
  if (thinProfile / total > 0.4) {
    out.push({
      id: 'project-clinic',
      title: 'Run a project and resume clinic',
      reason: `${thinProfile} students have fewer than two projects on their profile.`,
      affected: thinProfile,
      priority: 'medium',
      action: 'Projects are the strongest signal on a student resume and the easiest gap to close.',
    });
  }

  // The single most-claimed but least-proven skill is the highest-leverage
  // thing to run an assessment session on.
  const unproven = [...skills].sort((a, b) => b.unproven - a.unproven)[0];
  if (unproven && unproven.unproven >= Math.max(3, total * 0.2)) {
    out.push({
      id: `verify-${unproven.skill}`,
      title: `Verify ${unproven.skill} across the cohort`,
      reason: `${unproven.unproven} students list ${unproven.skill} but have never been assessed on it.`,
      affected: unproven.unproven,
      priority: 'medium',
      action: 'Unproven claims are the first thing a recruiter discounts.',
    });
  }

  const RANK = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.affected - a.affected);
}
