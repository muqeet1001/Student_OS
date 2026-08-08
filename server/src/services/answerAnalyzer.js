/**
 * Deterministic interview-answer scoring.
 *
 * Scores four dimensions the student can actually act on, using only the
 * answer text and the question's expected keywords. No model is involved:
 * every point is reproducible and explainable, which matters more here than
 * nuance — a student acting on "you never quantified anything" improves,
 * while an opaque score teaches nothing.
 *
 * `scoreAnswer` returns the shape the report screen renders directly.
 */

const STAR_MARKERS = {
  situation: /\b(when|while|during|at the time|context|background|last (year|semester|month))\b/i,
  task: /\b(needed to|had to|my (job|role|task|responsibility)|was asked|goal was|objective)\b/i,
  action: /\b(i (built|wrote|led|designed|implemented|created|refactored|migrated|proposed|organised|organized|decided|added|fixed|automated))\b/i,
  result: /\b(as a result|which (led|resulted)|ended up|we (shipped|launched|reduced|improved|increased)|the outcome|finally|in the end)\b/i,
};

const QUANTIFIER = /\b\d+(\.\d+)?\s?(%|percent|x|k|m|bn|ms|s|seconds?|minutes?|hours?|days?|weeks?|months?|years?|users?|requests?|people|members?|times)\b/i;

const FILLERS = /\b(um+|uh+|like|you know|basically|actually|kind of|sort of|i guess|i mean|stuff|things)\b/gi;

const HEDGES = /\b(maybe|probably|i think|i believe|possibly|might be|not sure|somewhat)\b/gi;

const FIRST_PERSON = /\b(i|my|me)\b/gi;

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** How many of the question's expected keywords the answer actually touches. */
function keywordCoverage(text, keywords) {
  if (!keywords?.length) return { hit: [], missed: [], ratio: 1 };

  const haystack = text.toLowerCase();
  const hit = [];
  const missed = [];

  for (const keyword of keywords) {
    // Match on whole words so "api" does not match "rapid".
    const pattern = new RegExp(`\\b${keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (pattern.test(haystack)) hit.push(keyword);
    else missed.push(keyword);
  }

  return { hit, missed, ratio: hit.length / keywords.length };
}

function scoreStructure(text, round) {
  // Only narrative rounds are expected to follow STAR.
  const narrative = round === 'behavioural' || round === 'hr';
  const present = Object.entries(STAR_MARKERS).filter(([, pattern]) => pattern.test(text));

  if (!narrative) {
    // Technical answers are judged on ordering signals instead.
    const ordered = /\b(first|then|next|after that|finally|because|therefore|the trade-?off)\b/i.test(text);
    const paragraphs = text.split(/\n+/).filter((line) => line.trim()).length;
    return {
      score: clamp((ordered ? 65 : 35) + Math.min(35, paragraphs * 12)),
      present: [],
    };
  }

  return {
    score: clamp((present.length / 4) * 100),
    present: present.map(([name]) => name),
  };
}

function scoreSpecificity(text) {
  const list = words(text);
  const quantified = QUANTIFIER.test(text);
  const properNouns = (text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).length;

  let score = 30;
  if (quantified) score += 35;
  if (properNouns >= 2) score += 20;
  if (list.length >= 60) score += 15;

  return { score: clamp(score), quantified, properNouns };
}

function scoreDelivery(text) {
  const list = words(text);
  const count = list.length;

  const fillers = (text.match(FILLERS) ?? []).length;
  const hedges = (text.match(HEDGES) ?? []).length;
  const firstPerson = (text.match(FIRST_PERSON) ?? []).length;

  // Length band: too short says nothing, too long loses the interviewer.
  let score;
  if (count < 25) score = 25;
  else if (count < 60) score = 65;
  else if (count <= 220) score = 90;
  else if (count <= 320) score = 70;
  else score = 50;

  const fillerRate = count ? fillers / count : 0;
  score -= Math.min(25, fillerRate * 400);
  score -= Math.min(15, hedges * 4);

  return {
    score: clamp(score),
    wordCount: count,
    fillers,
    hedges,
    firstPerson,
  };
}

/**
 * Scores one answer.
 *
 * @param {string} answer   Raw text the student submitted.
 * @param {object} question `{ round, keywords }` from the question bank.
 * @returns {{score:number, dimensions:object, feedback:Array<{text:string, positive:boolean}>}}
 */
export function scoreAnswer(answer, question) {
  const text = (answer ?? '').trim();

  if (!text) {
    return {
      score: 0,
      dimensions: { structure: 0, specificity: 0, coverage: 0, delivery: 0 },
      feedback: [{ text: 'No answer was given, so there was nothing to assess.', positive: false }],
    };
  }

  const round = question?.round ?? 'behavioural';
  const narrative = round === 'behavioural' || round === 'hr';

  const structureResult = scoreStructure(text, round);
  const specificity = scoreSpecificity(text);
  const delivery = scoreDelivery(text);
  const coverage = keywordCoverage(text, question?.keywords);

  const dimensions = {
    structure: structureResult.score,
    specificity: specificity.score,
    coverage: clamp(coverage.ratio * 100),
    delivery: delivery.score,
  };

  // Relevance is weighted hardest: a beautifully delivered answer to the
  // wrong question still fails an interview.
  const score = clamp(
    dimensions.coverage * 0.35 +
      dimensions.structure * 0.25 +
      dimensions.specificity * 0.2 +
      dimensions.delivery * 0.2,
  );

  const feedback = [];

  if (narrative) {
    const missingStar = ['situation', 'task', 'action', 'result'].filter(
      (part) => !structureResult.present.includes(part),
    );
    if (missingStar.length === 0) {
      feedback.push({ text: 'Your answer follows the full STAR structure.', positive: true });
    } else {
      feedback.push({
        text: `Add the ${missingStar.join(', ')} ${
          missingStar.length > 1 ? 'parts' : 'part'
        } — STAR answers land better because the interviewer can follow them.`,
        positive: false,
      });
    }
  } else if (dimensions.structure >= 65) {
    feedback.push({ text: 'Your reasoning is sequenced clearly.', positive: true });
  } else {
    feedback.push({
      text: 'Walk through your reasoning in order — state the approach, then the trade-offs.',
      positive: false,
    });
  }

  if (specificity.quantified) {
    feedback.push({ text: 'Good use of concrete numbers.', positive: true });
  } else {
    feedback.push({
      text: 'Quantify the impact. "Cut build time by 40%" beats "made it faster".',
      positive: false,
    });
  }

  if (coverage.missed.length > 0) {
    feedback.push({
      text: `Did not touch on: ${coverage.missed.slice(0, 4).join(', ')}.`,
      positive: false,
    });
  } else if (question?.keywords?.length) {
    feedback.push({ text: 'Covered every point this question looks for.', positive: true });
  }

  if (delivery.wordCount < 40) {
    feedback.push({
      text: `At ${delivery.wordCount} words this is too brief — aim for 60–150.`,
      positive: false,
    });
  } else if (delivery.wordCount > 320) {
    feedback.push({
      text: `At ${delivery.wordCount} words this rambles — tighten it to about 150.`,
      positive: false,
    });
  }

  if (delivery.fillers >= 3) {
    feedback.push({
      text: `Filler words appeared ${delivery.fillers} times; cutting them sounds more confident.`,
      positive: false,
    });
  }

  if (narrative && delivery.firstPerson === 0) {
    feedback.push({
      text: 'Say what *you* did. Interviewers score the individual, not the team.',
      positive: false,
    });
  }

  return { score, dimensions, feedback };
}

/** Rolls per-answer results into the session-level report. */
export function summariseSession(results) {
  const scored = results.filter((item) => !item.skipped);

  if (scored.length === 0) {
    return {
      overallScore: 0,
      dimensions: { structure: 0, specificity: 0, coverage: 0, delivery: 0 },
      verdict: 'Not attempted',
      summary: ['Every question was skipped, so there is nothing to score yet.'],
    };
  }

  const average = (key) =>
    Math.round(scored.reduce((sum, item) => sum + item.dimensions[key], 0) / scored.length);

  const dimensions = {
    structure: average('structure'),
    specificity: average('specificity'),
    coverage: average('coverage'),
    delivery: average('delivery'),
  };

  // Skipped questions still count against the round — you cannot skip in a
  // real interview.
  const overallScore = Math.round(
    scored.reduce((sum, item) => sum + item.score, 0) / results.length,
  );

  const verdict =
    overallScore >= 80
      ? 'Interview ready'
      : overallScore >= 60
        ? 'Nearly there'
        : overallScore >= 40
          ? 'Needs practice'
          : 'Needs significant work';

  const LABELS = {
    structure: 'structuring answers so they are easy to follow',
    specificity: 'backing claims with concrete numbers and names',
    coverage: 'answering what the question actually asks',
    delivery: 'pacing — length, filler words and confidence',
  };

  const summary = Object.entries(dimensions)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .filter(([, value]) => value < 80)
    .map(([key, value]) => `Focus on ${LABELS[key]} (currently ${value}%).`);

  if (results.some((item) => item.skipped)) {
    summary.push('You skipped at least one question — in a real round that is not an option.');
  }

  if (summary.length === 0) summary.push('Strong across every dimension. Keep rehearsing to stay sharp.');

  return { overallScore, dimensions, verdict, summary };
}
