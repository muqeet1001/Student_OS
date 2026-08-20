import { scoreResume } from './atsScore.js';
import { roleByKey } from './roleProfiles.js';
import { canonicalise } from './skillTaxonomy.js';

export const DEFAULT_READINESS_WEIGHTS = { skills: 0.2, coding: 0.3, resume: 0.2, interview: 0.2, projects: 0.1 };

export function normaliseReadinessWeights(configured) {
  if (!configured) return DEFAULT_READINESS_WEIGHTS;
  const raw = typeof configured.toObject === 'function' ? configured.toObject() : configured;
  return Object.fromEntries(Object.keys(DEFAULT_READINESS_WEIGHTS).map((key) => [key, Number(raw[key] ?? 0) / 100]));
}

export function matchTargetRole(profile, roleKey = profile?.targetRole) {
  const role = roleByKey(roleKey);
  if (!role) return null;
  const held = new Set([
    ...(profile?.skills ?? []).map((skill) => canonicalise(skill.name)),
    ...(profile?.projects ?? []).flatMap((project) => (project.techStack ?? []).map(canonicalise)),
  ].filter(Boolean));
  const verified = new Set((profile?.skills ?? []).filter((skill) => skill.verified).map((skill) => canonicalise(skill.name)));
  const check = (name) => ({ name, has: held.has(name), verified: verified.has(name) });
  const required = role.required.map(check);
  const preferred = role.preferred.map(check);
  const earned = required.filter((skill) => skill.has).length * 2 + preferred.filter((skill) => skill.has).length;
  const possible = role.required.length * 2 + role.preferred.length;
  return {
    role: { key: role.key, label: role.label, icon: role.icon, codingTarget: role.codingTarget },
    score: possible ? Math.round((earned / possible) * 100) : 0,
    required,
    preferred,
    missing: [...required, ...preferred].filter((skill) => !skill.has).map((skill) => skill.name),
  };
}

export function calculateReadinessEvidence({ profile, user, solvedCount = 0, totalProblems = 0, interviewAverage = 0, configuredWeights }) {
  const weights = normaliseReadinessWeights(configuredWeights);
  const skills = profile?.skills ?? [];
  const verifiedCount = skills.filter((skill) => skill.verified).length;
  const roleMatch = matchTargetRole(profile);
  const codingTarget = roleMatch?.role.codingTarget ?? 60;
  const codingDenominator = Math.max(1, Math.min(codingTarget, totalProblems || codingTarget));
  const projects = profile?.projects ?? [];
  const atsReport = profile ? scoreResume({ profile, user }) : { score: 0, checks: [] };
  const values = {
    skills: roleMatch ? roleMatch.score : Math.min(100, skills.length * 10 + verifiedCount * 10),
    coding: Math.min(100, Math.round((solvedCount / codingDenominator) * 100)),
    resume: atsReport.score,
    interview: Math.round(interviewAverage || 0),
    projects: Math.min(100, projects.length * 30 + projects.filter((project) => (project.description ?? '').length > 60).length * 10),
  };
  const readiness = Math.round(Object.entries(values).reduce((sum, [key, value]) => sum + value * weights[key], 0));
  return { values, readiness, weights, roleMatch, codingTarget, codingDenominator, atsReport, verifiedCount };
}
