import React, { useEffect, useMemo, useRef } from 'react';
import { useApiResource } from '../../hooks/useApiResource.js';

const DAY_MS = 86_400_000;
const LEVELS = [
  'bg-surface-container',
  'bg-primary/25',
  'bg-primary/50',
  'bg-primary/75',
  'bg-primary',
];

const dateKey = (date) => date.toISOString().slice(0, 10);

function levelFor(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function buildWeeks(today = new Date()) {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const requestedStart = new Date(end.getTime() - 364 * DAY_MS);
  const start = new Date(requestedStart.getTime() - requestedStart.getUTCDay() * DAY_MS);
  const days = [];

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    days.push(new Date(cursor));
  }

  const weeks = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}

export default function ActivityHeatmap() {
  const { data, loading } = useApiResource('/dashboard/activity?days=365');
  const scrollRef = useRef(null);
  const weeks = useMemo(() => buildWeeks(), []);
  const activityByDay = useMemo(
    () => new Map((data?.activity ?? []).map((day) => [day.date, day])),
    [data?.activity],
  );

  const monthLabels = weeks.map((week, index) => {
    const month = week[0].getUTCMonth();
    const previous = index ? weeks[index - 1][0].getUTCMonth() : -1;
    return month !== previous
      ? week[0].toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
      : '';
  });

  // On narrow screens the most recent weeks matter first; desktop shows the
  // whole year, while mobile opens the horizontal calendar at its right edge.
  useEffect(() => {
    if (!loading && scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [loading]);

  return (
    <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Consistency view</p>
          <h2 className="font-headline text-lg font-black mt-1">Preparation streak</h2>
          <p className="text-xs text-on-surface-variant mt-1">Completed coding, assessments, interviews and applications over the last year.</p>
        </div>
        {!loading && (
          <div className="flex gap-5 text-right">
            <div><p className="font-headline text-xl font-black tabular-nums">{data.currentStreak}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Current streak</p></div>
            <div><p className="font-headline text-xl font-black tabular-nums">{data.longestStreak}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Longest streak</p></div>
            <div><p className="font-headline text-xl font-black tabular-nums">{data.activeDays}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Active days</p></div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-36 rounded-lg bg-surface-container-low animate-pulse mt-5" aria-label="Loading preparation activity" />
      ) : (
        <>
          <div ref={scrollRef} className="overflow-x-auto mt-5 pb-2" tabIndex="0" aria-label="One year preparation activity calendar">
            <div className="min-w-[46rem]">
              <div className="ml-8 grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
                {monthLabels.map((label, index) => <span key={`${index}-${label}`} className="text-[9px] text-on-surface-variant">{label}</span>)}
              </div>
              <div className="grid grid-cols-[1.75rem_1fr] gap-1">
                <div className="grid grid-rows-7 gap-1 text-[9px] text-on-surface-variant">
                  <span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span />
                </div>
                <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
                  {weeks.flatMap((week) => week).map((date) => {
                    const key = dateKey(date);
                    const day = activityByDay.get(key);
                    const detail = day
                      ? `${day.coding} coding, ${day.assessments} assessments, ${day.interviews} interviews, ${day.applications} applications`
                      : 'No recorded activity';
                    return (
                      <span
                        key={key}
                        title={`${date.toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}: ${day?.count ?? 0} contributions — ${detail}`}
                        aria-label={`${key}: ${day?.count ?? 0} preparation contributions`}
                        className={`aspect-square min-w-2.5 rounded-[2px] ${LEVELS[levelFor(day?.count ?? 0)]}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 text-xs text-on-surface-variant">
            <p><strong className="text-on-surface tabular-nums">{data.totalContributions}</strong> meaningful contributions across {data.activeDays} days</p>
            <div className="flex items-center gap-1.5"><span>Less</span>{LEVELS.map((className, index) => <span key={className} className={`w-3 h-3 rounded-[2px] ${className}`} aria-label={`Activity intensity ${index}`} />)}<span>More</span></div>
          </div>
        </>
      )}
    </section>
  );
}
