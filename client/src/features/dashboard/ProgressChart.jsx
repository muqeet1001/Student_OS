import React from 'react';
import { useApiResource } from '../../hooks/useApiResource.js';

const SERIES = [
  { key: 'score', label: 'Readiness', className: 'stroke-primary' },
  { key: 'coding', label: 'Coding', className: 'stroke-blue-600' },
  { key: 'skills', label: 'Skills', className: 'stroke-green-600' },
  { key: 'resume', label: 'ATS', className: 'stroke-amber-600' },
  { key: 'interview', label: 'Interview', className: 'stroke-purple-600' },
];

const valueFor = (snapshot, key) => key === 'score' ? snapshot.score : snapshot.components?.[key] ?? 0;

/**
 * Readiness over time.
 *
 * History starts the day snapshots were introduced — it cannot be
 * backfilled, because every input only exposes its current value. Until
 * there are two points this says so rather than drawing a flat line that
 * implies no progress.
 */
export default function ProgressChart() {
  const { data, loading } = useApiResource('/dashboard/history?days=90');

  const snapshots = data?.snapshots ?? [];
  const trend = data?.trend;

  if (loading) return null;

  if (snapshots.length < 2) {
    return (
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-2">
          Your progress
        </h2>
        <p className="text-sm text-on-surface-variant">
          Your readiness is recorded each day you use Student OS. Come back tomorrow and this
          becomes a chart of how far you have moved.
        </p>
      </section>
    );
  }

  const width = 600;
  const height = 120;
  const pad = 4;

  const pointsFor = (key) => snapshots.map((snapshot, index) => {
    const x = pad + (index / (snapshots.length - 1)) * (width - pad * 2);
    const y = height - pad - (valueFor(snapshot, key) / 100) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const rising = trend && trend.change > 0;

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
          Your progress
        </h2>
        {trend && (
          <span
            className={`text-xs font-black tabular-nums ${
              rising ? 'text-green-700' : trend.change < 0 ? 'text-error' : 'text-on-surface-variant'
            }`}
          >
            {trend.change > 0 ? '+' : ''}
            {trend.change} points
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {SERIES.map((series) => <span key={series.key} className="text-[10px] font-bold text-on-surface-variant">{series.label}: {valueFor(snapshots.at(-1), series.key)}%</span>)}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Readiness moved from ${snapshots[0].score}% to ${snapshots.at(-1).score}% over ${snapshots.length} days`}
      >
        {[25, 50, 75].map((line) => (
          <line
            key={line}
            x1={0}
            x2={width}
            y1={height - pad - (line / 100) * (height - pad * 2)}
            y2={height - pad - (line / 100) * (height - pad * 2)}
            className="stroke-outline-variant/40"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

        {SERIES.map((series) => (
          <polyline
            key={series.key}
            points={pointsFor(series.key)}
            fill="none"
            className={series.className}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
        <span>{new Date(snapshots[0].day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        <span className="font-bold text-on-surface">{snapshots.at(-1).score}% today</span>
        <span>{new Date(snapshots.at(-1).day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
      </div>
    </section>
  );
}
