import React from 'react';
import { Link } from 'react-router-dom';

function Radial({ value }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120" role="img" aria-label={`${value} out of 100`}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-headline tracking-tight tabular-nums">{value}</span>
        <span className="text-[10px] font-bold text-on-surface-variant">/ 100</span>
      </div>
    </div>
  );
}

/**
 * The headline answer to "how ready am I?", with the five signals that
 * produced it. Showing the breakdown beside the number is what turns a score
 * into something a student can act on.
 */
export default function ReadinessCard({ readiness }) {
  const label =
    readiness.score >= 80
      ? 'Placement ready'
      : readiness.score >= 60
        ? 'Nearly ready'
        : readiness.score >= 35
          ? 'Building up'
          : 'Just getting started';

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Placement readiness
          </h2>
          <p className="font-headline text-base font-bold mt-1">{label}</p>
        </div>
        <Link
          to="/my-plan"
          className="text-xs font-bold text-primary hover:underline whitespace-nowrap shrink-0"
        >
          View report
        </Link>
      </div>

      <div className="flex items-center gap-5">
        <Radial value={readiness.score} />

        <dl className="flex-1 min-w-0 space-y-2">
          {readiness.components.map((part) => (
            <div key={part.key}>
              <div className="flex justify-between items-baseline text-xs mb-1">
                <dt
                  className={`font-bold ${
                    part.key === readiness.weakest ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {part.label}
                  {part.key === readiness.weakest && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider">weakest</span>
                  )}
                </dt>
                <dd className="font-black tabular-nums">{part.value}%</dd>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${
                    part.key === readiness.weakest ? 'bg-primary' : 'bg-on-surface/25'
                  }`}
                  style={{ width: `${part.value}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
