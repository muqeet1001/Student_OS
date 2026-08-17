import React from 'react';
import { Link } from 'react-router-dom';

const BANDS = [
  { min: 80, label: 'Placement ready', next: null },
  { min: 60, label: 'Nearly ready', next: 80 },
  { min: 35, label: 'Building up', next: 60 },
  { min: 0, label: 'Getting started', next: 35 },
];

const ACTIONS = {
  skills: { label: 'Close skill gaps', to: '/skills' },
  coding: { label: 'Practice coding', to: '/coding-practice' },
  resume: { label: 'Improve resume', to: '/resume-builder' },
  interview: { label: 'Practice interview', to: '/ai-interview' },
  projects: { label: 'Strengthen projects', to: '/profile' },
};

function Radial({ value, large = false }) {
  const radius = large ? 58 : 52;
  const circumference = 2 * Math.PI * radius;
  const size = large ? 'w-40 h-40' : 'w-32 h-32';
  const viewBox = large ? '0 0 132 132' : '0 0 120 120';
  const center = large ? 66 : 60;

  return (
    <div className="relative shrink-0">
      <svg className={`${size} -rotate-90`} viewBox={viewBox} role="img" aria-label={`${value} out of 100`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container" />
        <circle
          cx={center}
          cy={center}
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
        <span className={`${large ? 'text-5xl' : 'text-3xl'} font-black font-headline tracking-tight tabular-nums`}>{value}</span>
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
export default function ReadinessCard({ readiness, targetRole, prominent = false, showReportLink = true }) {
  const band = BANDS.find((item) => readiness.score >= item.min);
  const weakest = readiness.components.find((part) => part.key === readiness.weakest);
  const action = ACTIONS[readiness.weakest] ?? { label: 'Open my plan', to: '/my-plan' };
  const pointsToNext = band.next ? band.next - readiness.score : 0;

  return (
    <section id="readiness" className={`bg-surface-container-lowest rounded-xl border border-outline-variant/60 ${prominent ? 'p-6 md:p-7' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Placement readiness
          </h2>
          <p className={`${prominent ? 'text-xl' : 'text-base'} font-headline font-black mt-1`}>{band.label}</p>
          <p className="text-xs text-on-surface-variant mt-1">
            {targetRole?.role?.label
              ? `Measured for ${targetRole.role.label}`
              : 'Based on five placement signals'}
          </p>
        </div>
        {showReportLink && (
          <Link
            to="/my-plan#readiness"
            className="text-xs font-bold text-primary hover:underline whitespace-nowrap shrink-0"
          >
            Full report
          </Link>
        )}
      </div>

      <div className={`flex ${prominent ? 'flex-col sm:flex-row sm:items-center gap-6' : 'items-center gap-5'}`}>
        <div className="flex items-center gap-4 shrink-0">
          <Radial value={readiness.score} large={prominent} />
          {prominent && (
            <div className="sm:hidden">
              {band.next ? (
                <><p className="text-2xl font-black tabular-nums">{pointsToNext}</p><p className="text-xs text-on-surface-variant">points to {band.next}</p></>
              ) : (
                <><span className="material-symbols-outlined text-green-600">verified</span><p className="text-xs font-bold">Ready band reached</p></>
              )}
            </div>
          )}
        </div>

        <dl className={`flex-1 min-w-0 ${prominent ? 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 w-full' : 'space-y-2'}`}>
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

      {prominent && (
        <div className="mt-5 pt-4 border-t border-outline-variant/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">
              {band.next
                ? `${pointsToNext} points to the ${band.next}% milestone`
                : 'You are in the placement-ready band'}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {weakest ? `${weakest.label} is currently your biggest opportunity at ${weakest.value}%.` : 'Keep your evidence current.'}
            </p>
          </div>
          <Link to={action.to} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold shrink-0">
            {action.label}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      )}
    </section>
  );
}
