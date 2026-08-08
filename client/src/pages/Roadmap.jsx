import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

function Task({ task }) {
  return (
    <li>
      <Link
        to={task.to}
        className="flex items-start gap-2.5 p-3 -mx-1 rounded-lg hover:bg-surface-container-low transition-colors group"
      >
        <span
          className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${
            task.done ? 'text-green-600' : 'text-outline-variant'
          }`}
          style={task.done ? { fontVariationSettings: '"FILL" 1' } : undefined}
        >
          {task.done ? 'check_circle' : 'radio_button_unchecked'}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-bold ${
              task.done ? 'text-on-surface-variant line-through' : 'text-on-surface'
            }`}
          >
            {task.label}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{task.why}</p>
        </div>

        {task.progress && (
          <span className="text-[10px] font-black tabular-nums text-on-surface-variant shrink-0 mt-0.5">
            {task.progress}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * The four-week plan.
 *
 * Every item completes itself from real evidence — a verified skill, a
 * solved count, a submitted interview. There are no checkboxes to tick,
 * because a plan you can tick without doing the work measures nothing.
 */
export default function Roadmap() {
  const { data, loading, error, refetch } = useApiResource('/dashboard/roadmap');

  if (loading && !data) return <LoadingBlock label="Building your roadmap" className="min-h-dvh" />;
  if (error) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { weeks, progress, targetRole } = data;
  const current = weeks.find((week) => !week.complete);

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-4xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            Your placement roadmap
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {targetRole
              ? `Four weeks to being ready for ${targetRole.role.label}.`
              : 'Four weeks to being placement ready. Pick a target role and this sharpens.'}
          </p>
        </header>

        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              Overall progress
            </span>
            <span className="text-sm font-black tabular-nums">
              {progress.done} / {progress.total}
            </span>
          </div>

          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-700"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <p className="text-xs text-on-surface-variant mt-2">
            {current
              ? `You're on week ${current.week} — ${current.theme.toLowerCase()}.`
              : 'Every milestone is done. Start applying.'}
          </p>
        </section>

        <ol className="space-y-3">
          {weeks.map((week) => {
            const active = current?.week === week.week;

            return (
              <li
                key={week.week}
                className={`bg-surface-container-lowest rounded-xl border p-5 ${
                  active ? 'border-primary/40' : 'border-outline-variant/60'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      week.complete
                        ? 'bg-green-600 text-white'
                        : active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {week.complete ? '✓' : week.week}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm">
                      Week {week.week} · {week.theme}
                    </h2>
                  </div>

                  <span className="text-xs font-black tabular-nums text-on-surface-variant shrink-0">
                    {week.done}/{week.total}
                  </span>
                </div>

                <ul className="space-y-0.5">
                  {week.tasks.map((task) => (
                    <Task key={task.id} task={task} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>

        <p className="text-xs text-outline text-center">
          Nothing here is ticked by hand — each item completes itself when the work is done.
        </p>
      </div>
    </div>
  );
}
