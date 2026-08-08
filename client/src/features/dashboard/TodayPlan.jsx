import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The answer to "what should I do today?".
 *
 * Deliberately capped at four tasks: a plan a student can finish is worth
 * more than a complete backlog they ignore.
 */
export default function TodayPlan({ plan }) {
  if (!plan?.tasks?.length) {
    return (
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
          Today's plan
        </h2>
        <div className="flex items-center gap-2.5 text-sm">
          <span
            className="material-symbols-outlined text-green-600"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            task_alt
          </span>
          <p className="font-bold">You're on top of everything.</p>
        </div>
      </section>
    );
  }

  const pct = plan.total ? Math.round((plan.completed / plan.total) * 100) : 0;
  const next = plan.tasks.find((task) => !task.done) ?? plan.tasks[0];

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
          Today's plan
        </h2>
        <span className="text-xs font-black tabular-nums">
          {plan.completed} / {plan.total}
        </span>
      </div>

      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-primary rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1 mb-4">
        {plan.tasks.map((task) => (
          <li key={task.id}>
            <Link
              to={task.to}
              className="flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-surface-container-low transition-colors group"
            >
              <span
                className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${
                  task.done ? 'text-green-600' : 'text-outline-variant'
                }`}
                style={task.done ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {task.done ? 'check_circle' : 'radio_button_unchecked'}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-bold ${
                    task.done ? 'text-on-surface-variant line-through' : 'text-on-surface'
                  }`}
                >
                  {task.label}
                </span>
                <span className="block text-xs text-on-surface-variant">{task.hint}</span>
              </span>

              <span className="material-symbols-outlined text-base text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                arrow_forward
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to={next.to}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-dim transition-colors"
      >
        Continue plan
        <span className="material-symbols-outlined text-base">arrow_forward</span>
      </Link>
    </section>
  );
}
