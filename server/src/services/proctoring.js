import { ApiError } from '../utils/ApiError.js';

export const MAX_PROCTORING_WARNINGS = 2;

export const PROCTORING_VIOLATION_LABELS = Object.freeze({
  'camera-stopped': 'Camera was turned off',
  'no-face': 'No face remained visible',
  'multiple-faces': 'Multiple faces were detected',
  'excessive-movement': 'Unusual movement moved the candidate out of position',
  'tab-hidden': 'The assessment tab was hidden',
  'window-blur': 'The assessment window lost focus',
});

/**
 * Adds one idempotent violation to an attempt and owns the two-strike rule.
 * The caller must save the document. Keeping this server-side means changing
 * browser state cannot turn a disqualified zero back into a graded attempt.
 */
export function recordProctoringViolation(attempt, event, now = new Date()) {
  if (attempt.status === 'disqualified') {
    return { duplicate: true, disqualified: true, warningCount: MAX_PROCTORING_WARNINGS };
  }
  if (attempt.status !== 'in-progress') {
    throw ApiError.badRequest('This attempt is already finished');
  }

  const violations = attempt.proctoring?.violations ?? [];
  if (violations.some((item) => item.eventId === event.eventId)) {
    return {
      duplicate: true,
      disqualified: false,
      warningCount: attempt.proctoring?.warningCount ?? violations.length,
    };
  }

  const label = PROCTORING_VIOLATION_LABELS[event.type];
  if (!label) throw ApiError.badRequest('Unknown proctoring violation');

  violations.push({
    eventId: event.eventId,
    type: event.type,
    occurredAt: event.occurredAt,
    receivedAt: now,
    detail: event.detail ?? '',
  });

  const warningCount = Math.min(MAX_PROCTORING_WARNINGS, violations.length);
  attempt.proctoring.warningCount = warningCount;
  attempt.proctoring.violations = violations;

  if (warningCount >= MAX_PROCTORING_WARNINGS) {
    attempt.status = 'disqualified';
    attempt.score = 0;
    attempt.percentage = 0;
    attempt.passed = false;
    attempt.level = 'beginner';
    attempt.submittedAt = now;
    attempt.proctoring.disqualifiedAt = now;
    attempt.proctoring.reason = label;
  }

  return {
    duplicate: false,
    disqualified: attempt.status === 'disqualified',
    warningCount,
    maxWarnings: MAX_PROCTORING_WARNINGS,
    message:
      warningCount >= MAX_PROCTORING_WARNINGS
        ? `${label}. This was the second warning, so the attempt has been ended with a score of zero.`
        : `${label}. Warning 1 of ${MAX_PROCTORING_WARNINGS}. Another confirmed violation will end the attempt with a score of zero.`,
  };
}
