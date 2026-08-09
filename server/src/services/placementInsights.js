import { askModelForJson } from './aiClient.js';

/**
 * A written reading of the placement position.
 *
 * The rule this service is built around: **the model never produces a
 * number, and never introduces a recommendation.** Every figure it sees has
 * already been computed deterministically, and every action it can propose
 * must map to a finding those same services already generated. Its job is
 * interpretation and priority — which of nine true things matters most this
 * month, and what a placement officer should do on Monday.
 *
 * That is not timidity about hallucination for its own sake. These numbers
 * get quoted to principals and printed in brochures. A model that rounds 62%
 * to "about two-thirds" in one paragraph and "nearly 70%" in the next has
 * made the whole page untrustworthy, and nobody would be able to tell which
 * parts were computed and which were improvised.
 */

const SYSTEM = `You are advising the placement office of an Indian engineering college.

You will be given figures that have ALREADY been computed from their data,
and a list of candidate findings that were derived from those figures.

Rules you must follow:
- Never state a number that is not in the data you were given. Do not
  recalculate, re-express, round or estimate. If you want to cite a figure,
  copy it exactly.
- Never invent a recommendation. You may only select, order and explain the
  candidate findings you were given, using their exact ids.
- Write for a busy placement officer, not a data scientist. Plain sentences.
  No preamble, no restating the question, no bullet-point padding.
- Be direct about bad news. A college that is told its placement rate fell
  can act; one that is told it "faces headwinds" cannot.

Reply with JSON only, in this shape:
{
  "headline": "one sentence on where this cohort stands",
  "summary": "two or three sentences a principal could read",
  "priorities": [
    { "id": "<id of a candidate finding>", "why": "one sentence on why this is first" }
  ],
  "watch": "one sentence on the thing most likely to go wrong next, or null"
}`;

/**
 * Assembles the prompt from figures the caller already computed.
 *
 * Deliberately compact: sending whole documents wastes tokens and invites
 * the model to comment on fields nobody asked about.
 */
export function buildPrompt({ analytics, placement, recruiters, alumni }) {
  const lines = [];

  lines.push('## Cohort');
  lines.push(`Students: ${analytics.totals.students}`);
  lines.push(`Average readiness: ${analytics.totals.averageReadiness}%`);
  lines.push(
    `Ready: ${analytics.totals.ready}, progressing: ${analytics.totals.progressing}, at risk: ${analytics.totals.atRisk}`,
  );

  if (analytics.departments?.length) {
    lines.push('\n## By department');
    for (const department of analytics.departments.slice(0, 8)) {
      lines.push(
        `${department.branch}: ${department.students} students, average readiness ${department.averageReadiness}%, ${department.atRisk} at risk`,
      );
    }
  }

  if (placement) {
    lines.push('\n## Placements so far');
    lines.push(
      `Placed ${placement.totals.placed} of ${placement.totals.students} (${placement.totals.placementRate}%), from ${placement.totals.offers} offers`,
    );
    if (placement.salary.reported > 0) {
      lines.push(
        `Median package ${placement.salary.median}, highest ${placement.salary.highest} (${placement.salary.reported} reported)`,
      );
    }
  }

  if (alumni?.trend) {
    lines.push('\n## Year on year (completed batches only)');
    lines.push(
      `${alumni.trend.from} to ${alumni.trend.to}: placement rate change ${alumni.trend.placementRateChange} points, median package change ${alumni.trend.medianChange}`,
    );
  }

  if (recruiters?.gaps?.length) {
    lines.push('\n## What recruiters said');
    lines.push(`Responses: ${recruiters.responses}, median rating ${recruiters.rating.median}/5`);
    for (const gap of recruiters.gaps.slice(0, 5)) {
      lines.push(`${gap.recruiters} recruiters named "${gap.label}" (${gap.companies.join(', ')})`);
    }
  }

  lines.push('\n## Candidate findings (you may only choose from these ids)');
  for (const finding of candidateFindings({ analytics, recruiters })) {
    lines.push(`- ${finding.id}: ${finding.title} — ${finding.reason}`);
  }

  return lines.join('\n');
}

/**
 * Everything the deterministic services already concluded, flattened.
 *
 * This is the closed set the model must choose from. A "priority" naming an
 * id outside this list is dropped, which makes an invented recommendation
 * structurally impossible to display rather than merely unlikely.
 */
export function candidateFindings({ analytics, recruiters }) {
  const findings = [...(analytics.recommendations ?? [])];

  for (const gap of recruiters?.gaps ?? []) {
    if (gap.recruiters < 2) continue;
    findings.push({
      id: `recruiter-${gap.key}`,
      title: `Address ${gap.label.toLowerCase()}`,
      reason: `${gap.recruiters} recruiters named it: ${gap.companies.join(', ')}.`,
      affected: gap.recruiters,
      source: 'recruiter-feedback',
    });
  }

  return findings;
}

/**
 * @returns {Promise<{insight: object|null, error: string|null, findings: Array}>}
 */
export async function buildPlacementInsight(inputs) {
  const findings = candidateFindings(inputs);

  // Nothing to interpret. Saying so is better than asking a model to find
  // meaning in an empty cohort, which it will oblige by inventing some.
  if (inputs.analytics.totals.students === 0) {
    return {
      insight: null,
      error: 'There are no students in this cohort yet.',
      findings,
    };
  }

  const { data, error } = await askModelForJson({
    system: SYSTEM,
    prompt: buildPrompt(inputs),
    maxTokens: 1200,
  });

  if (!data) return { insight: null, error, findings };

  return { insight: validateInsight(data, findings), error: null, findings };
}

/**
 * Keeps only what the model was allowed to say.
 *
 * Priorities are matched against the candidate ids and anything unrecognised
 * is discarded — along with the model's own wording for the action, which is
 * replaced by the deterministic finding's title and reason. The model
 * contributes the ordering and the "why", nothing else.
 */
export function validateInsight(data, findings) {
  const byId = new Map(findings.map((finding) => [finding.id, finding]));

  const priorities = (Array.isArray(data.priorities) ? data.priorities : [])
    .map((entry) => {
      const finding = byId.get(entry?.id);
      if (!finding) return null;

      return {
        id: finding.id,
        title: finding.title,
        reason: finding.reason,
        affected: finding.affected,
        source: finding.source ?? 'cohort-analysis',
        why: typeof entry.why === 'string' ? entry.why.slice(0, 400) : '',
      };
    })
    .filter(Boolean)
    // A model asked for an ordered list will occasionally repeat one.
    .filter((entry, index, all) => all.findIndex((row) => row.id === entry.id) === index)
    .slice(0, 5);

  const text = (value, limit) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null;

  return {
    headline: text(data.headline, 200),
    summary: text(data.summary, 1200),
    priorities,
    watch: text(data.watch, 300),
    /** So the page can say which parts a model wrote. */
    generated: true,
  };
}
