import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

/** Tier colours run cool-to-warm so rank reads at a glance, not from the label. */
const TIER_TONES = {
  Bronze: 'bg-amber-700/12 text-amber-800 border-amber-700/25',
  Silver: 'bg-slate-400/15 text-slate-700 border-slate-500/25',
  Gold: 'bg-yellow-500/15 text-yellow-800 border-yellow-600/30',
  Platinum: 'bg-teal-500/12 text-teal-800 border-teal-600/25',
  Diamond: 'bg-primary/10 text-primary border-primary/30',
};

function Badge({ badge }) {
  const locked = !badge.earned;

  return (
    <Link
      to={badge.to}
      className={`block rounded-xl border p-4 transition-colors ${
        locked
          ? 'border-dashed border-outline-variant/70 bg-surface-container-low/40 hover:bg-surface-container-low'
          : 'border-outline-variant/60 bg-surface-container-lowest hover:border-outline-variant'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
            locked
              ? 'bg-surface-container text-outline border-transparent'
              : TIER_TONES[badge.tier] ?? 'bg-surface-container'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={locked ? undefined : { fontVariationSettings: '"FILL" 1' }}
          >
            {locked ? 'lock' : badge.icon}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className={`font-bold text-sm truncate ${locked ? 'text-on-surface-variant' : ''}`}>
              {badge.label}
            </h3>
            {badge.tier && (
              <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant shrink-0">
                {badge.tier}
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant mt-0.5 tabular-nums">
            {badge.value} {badge.unit}
          </p>

          {badge.complete ? (
            <p className="text-[10px] font-bold text-green-700 mt-2">Every tier cleared.</p>
          ) : (
            <div className="mt-2">
              <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width] duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, badge.next.percentage))}%` }}
                />
              </div>
              <p className="text-[10px] text-outline mt-1">
                {badge.next.remaining} more for {badge.next.tier}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Badges and level.
 *
 * Nothing here is awarded by hand — every badge counts work recorded
 * elsewhere, so this page is a summary of effort rather than a second thing
 * to grind at.
 */
export default function Achievements() {
  const { data, loading, error, refetch } = useApiResource('/dashboard/achievements');

  if (loading && !data) {
    return <LoadingBlock label="Counting your achievements" className="min-h-dvh" />;
  }
  if (error) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { badges, level, totals } = data;
  const earned = badges.filter((badge) => badge.earned);
  const locked = badges.filter((badge) => !badge.earned);

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            Achievements
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Earned from work you have already done — there is nothing to claim here.
          </p>
        </header>

        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none opacity-80">
                Lvl
              </span>
              <span className="text-xl font-black leading-none tabular-nums">{level.level}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-headline text-base font-black">{level.title}</h2>
              <p className="text-xs text-on-surface-variant tabular-nums">
                {totals.tiers} of {totals.possibleTiers} tiers cleared · {totals.points} points
              </p>

              {level.next ? (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-[width] duration-700"
                      style={{ width: `${Math.max(0, Math.min(100, level.next.percentage))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-outline mt-1">
                    {level.next.remaining} points to level {level.next.level} · {level.next.title}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-green-700 mt-1.5">
                  Top level reached. Go and apply.
                </p>
              )}
            </div>
          </div>
        </section>

        {earned.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              Earned ({earned.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {earned.map((badge) => (
                <Badge key={badge.key} badge={badge} />
              ))}
            </div>
          </section>
        )}

        {locked.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              Not yet earned ({locked.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locked.map((badge) => (
                <Badge key={badge.key} badge={badge} />
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-outline text-center">
          Each badge links to the page where it is earned.
        </p>
      </div>
    </div>
  );
}
