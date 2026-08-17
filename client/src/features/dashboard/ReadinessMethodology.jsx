import React from 'react';

/**
 * Makes the headline score reproducible rather than asking students to trust
 * an unexplained number. The API owns weights and evidence descriptions so
 * this report cannot silently drift from the calculation.
 */
export default function ReadinessMethodology({ readiness }) {
  const components = readiness?.components ?? [];

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            How your score is determined
          </p>
          <h2 className="font-headline text-lg font-black mt-1">One weighted score, five evidence signals</h2>
        </div>
        <p className="text-xs text-on-surface-variant">
          Each signal is scored out of 100, multiplied by its weight, then rounded.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-5">
        {components.map((component) => {
          const weight = component.weight ?? 0;
          const contribution = component.value * weight;

          return (
            <article key={component.key} className="rounded-xl bg-surface-container-low p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-black">{component.label}</h3>
                <span className="text-xs font-bold text-primary tabular-nums">
                  {Math.round(weight * 100)}% weight
                </span>
              </div>
              <p className="font-headline text-2xl font-black tabular-nums mt-3">
                {component.value}
                <span className="text-xs text-on-surface-variant"> / 100</span>
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-2 min-h-12">
                {component.basis}
              </p>
              <div className="border-t border-outline-variant/60 mt-3 pt-3 flex justify-between text-xs">
                <span className="text-on-surface-variant">Adds to total</span>
                <strong className="tabular-nums">{contribution.toFixed(1)} pts</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg bg-inverse-surface text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm">
          {components.map((item) => `${item.value} × ${Math.round((item.weight ?? 0) * 100)}%`).join(' + ')}
        </p>
        <p className="font-headline text-lg font-black tabular-nums shrink-0">
          = {readiness.score} / 100
        </p>
      </div>

      <p className="text-xs text-on-surface-variant mt-3">
        Readiness is a planning signal based on evidence recorded in Student OS. It is not a guarantee of selection.
      </p>
    </section>
  );
}
