import React from 'react';

/** One consistent read of a match score everywhere it appears. */
export default function MatchBadge({ score, size = 'sm' }) {
  const tone =
    score >= 75
      ? 'bg-green-100 text-green-800'
      : score >= 50
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-surface-container text-on-surface-variant';

  const scale = size === 'lg' ? 'text-base px-3 py-1' : 'text-[11px] px-2 py-0.5';

  return (
    <span className={`shrink-0 rounded-2xl font-black tabular-nums ${tone} ${scale}`}>
      {score}%
    </span>
  );
}
