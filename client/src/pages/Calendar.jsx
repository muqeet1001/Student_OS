import React from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

const TYPE_ICONS = {
  drive: 'apartment',
  test: 'quiz',
  interview: 'record_voice_over',
  'pre-placement-talk': 'campaign',
  training: 'school',
  deadline: 'schedule',
};

const time = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const longDay = (value) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

/** Whole days between today and a date, so "in 3 days" needs no library. */
function daysAway(value) {
  const day = 24 * 60 * 60 * 1000;
  const today = new Date().setHours(0, 0, 0, 0);
  const target = new Date(value).setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / day);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

function Entry({ entry }) {
  return (
    <li className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-2xl bg-surface-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-lg text-on-surface-variant">
            {TYPE_ICONS[entry.type] ?? 'event'}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm">{entry.title}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {time(entry.startsAt)}–{time(entry.endsAt)}
            {entry.venue ? ` · ${entry.venue}` : ''}
          </p>

          {entry.description && (
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              {entry.description}
            </p>
          )}

          {entry.clashesWith?.length > 0 && (
            <p className="text-xs font-bold text-on-error-container mt-1.5">
              Clashes with {entry.clashesWith.join(', ')} — tell the placement office.
            </p>
          )}
        </div>

        {/*
         * A personal slot is called out, because "the drive starts at 9" when
         * your interview is at 2pm is how students lose an afternoon in a
         * corridor.
         */}
        {entry.slot && (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-2xl bg-primary/10 text-primary shrink-0 text-center leading-tight">
            Your slot
            <span className="block tabular-nums">Panel {entry.slot.panel}</span>
          </span>
        )}
      </div>
    </li>
  );
}

/** What this student personally has to turn up to, and when. */
export default function Calendar() {
  const { data, loading, error, refetch } = useApiResource('/calendar/me');

  if (loading && !data) return <LoadingBlock label="Loading your calendar" className="min-h-dvh" />;
  if (error) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { days, next, clashes } = data;

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            Your calendar
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Drives, tests and interviews you are expected at — with your own slot time where one has
            been assigned.
          </p>
        </header>

        {clashes > 0 && (
          <p className="bg-error-container/15 border border-error/30 rounded-xl px-4 py-3 text-xs font-bold text-on-error-container">
            You are expected in two places at once. The overlapping entries are marked below —
            contact the placement office to have one moved.
          </p>
        )}

        {next && (
          <section className="bg-inverse-surface text-white rounded-xl p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              {daysAway(next.startsAt)}
            </p>
            <h2 className="font-headline text-lg font-black mt-1">{next.title}</h2>
            <p className="text-sm opacity-80 mt-0.5">
              {time(next.startsAt)}
              {next.venue ? ` · ${next.venue}` : ''}
              {next.slot ? ` · panel ${next.slot.panel}` : ''}
            </p>
          </section>
        )}

        {days.length === 0 ? (
          <EmptyBlock
            icon="event_available"
            title="Nothing scheduled yet"
            description="Drives you are shortlisted for will appear here with your interview time."
          />
        ) : (
          <div className="space-y-4">
            {days.map((day) => (
              <section key={day.day}>
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant mb-2">
                  {longDay(day.day)}
                </h2>
                <ul className="space-y-2">
                  {day.events.map((entry) => (
                    <Entry key={`${entry._id}-${entry.startsAt}`} entry={entry} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
