import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const STATUS_TONES = {
  planned: 'bg-secondary-container text-on-secondary-container',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-surface-container text-on-surface-variant',
};

const VERDICT_TONES = {
  positive: 'bg-green-100 text-green-800 border-green-600/30',
  negative: 'bg-error-container/25 text-on-error-container border-error/30',
  inconclusive: 'bg-surface-container text-on-surface-variant border-outline-variant/60',
};

const TYPES = ['workshop', 'bootcamp', 'seminar', 'mock-drive', 'one-on-one'];
const COMPONENTS = ['skills', 'coding', 'resume', 'interview', 'projects'];

const field =
  'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-outline';

const rupees = (value) =>
  value >= 100_000 ? `₹${(value / 100_000).toFixed(1)}L` : `₹${value.toLocaleString('en-IN')}`;

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function toLocalInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function NewSession({ onSaved, onCancel }) {
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [form, setForm] = useState({
    title: '',
    type: 'workshop',
    targetComponent: 'coding',
    trainer: '',
    provider: 'internal',
    cost: '',
    venue: '',
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(new Date(start.getTime() + 3 * 60 * 60 * 1000)),
  });
  const [saving, setSaving] = useState(false);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      payload.startsAt = new Date(form.startsAt).toISOString();
      payload.endsAt = new Date(form.endsAt).toISOString();
      if (payload.cost) payload.cost = Number(payload.cost);
      else delete payload.cost;

      await api.post('/trainings', payload);
      onSaved();
    } catch (caught) {
      window.alert(caught.message || 'Could not create that session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3"
    >
      <h3 className="font-headline text-base font-bold">Schedule a session</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="space-y-1 sm:col-span-2">
          <span className={labelClass}>Title</span>
          <input value={form.title} onChange={update('title')} required className={field} />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Type</span>
          <select value={form.type} onChange={update('type')} className={`${field} cursor-pointer`}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={labelClass}>What it should move</span>
          <select
            value={form.targetComponent}
            onChange={update('targetComponent')}
            className={`${field} cursor-pointer`}
          >
            {COMPONENTS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Trainer</span>
          <input value={form.trainer} onChange={update('trainer')} className={field} />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Provider</span>
          <select
            value={form.provider}
            onChange={update('provider')}
            className={`${field} cursor-pointer`}
          >
            <option value="internal">internal</option>
            <option value="external">external</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Cost (₹)</span>
          <input
            type="number"
            min="0"
            value={form.cost}
            onChange={update('cost')}
            placeholder="50000"
            className={field}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Venue</span>
          <input value={form.venue} onChange={update('venue')} className={field} />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Starts</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={update('startsAt')}
            required
            className={field}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Ends</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={update('endsAt')}
            required
            className={field}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Schedule session'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** The did-it-work panel, loaded on demand since it scans cohort history. */
function Effectiveness({ sessionId }) {
  const { data, loading, error } = useApiResource(`/trainings/${sessionId}/effectiveness`);

  if (loading && !data) return <p className="text-xs text-on-surface-variant">Measuring…</p>;
  if (error) return <p className="text-xs text-on-error-container">{error.message}</p>;

  const result = data.effectiveness;

  if (!result.measurable) {
    return (
      <div className="mt-3 pt-3 border-t border-outline-variant/60">
        <p className="text-xs text-on-surface-variant">{result.reason}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant/60 space-y-2.5">
      <div className={`rounded-lg border p-3 ${VERDICT_TONES[result.verdict]}`}>
        <p className="text-sm font-black">
          {result.lift > 0 ? '+' : ''}
          {result.lift} points beyond the rest of the cohort
        </p>
        <p className="text-[11px] mt-0.5 opacity-90">
          Attendees gained {result.attendees.meanDelta}, everyone else gained{' '}
          {result.comparison.meanDelta}, over {result.window.days} days.
        </p>
      </div>

      {/*
       * The component the session promised to move, checked separately: a
       * bootcamp that lifts overall readiness while leaving its own subject
       * flat is taking credit for a gain from somewhere else.
       */}
      {result.targetComponent && (
        <p className="text-xs text-on-surface-variant">
          <span className="font-bold">{result.targetComponent.label}</span> specifically:{' '}
          {result.targetComponent.lift > 0 ? '+' : ''}
          {result.targetComponent.lift} vs the comparison group
          {result.targetComponent.lift <= 0 && (
            <span className="text-on-error-container font-bold">
              {' '}
              — the thing this session was for did not move.
            </span>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-outline">
        <span>
          {result.attendees.measured} attendees vs {result.comparison.measured} others
        </span>
        <span>median {result.attendees.medianDelta}</span>
        {result.cost?.perPoint && <span>{rupees(result.cost.perPoint)} per point per student</span>}
      </div>

      <p className="text-[10px] text-outline leading-relaxed">{result.caveat}</p>
    </div>
  );
}

function SessionCard({ session, onChanged }) {
  const [showing, setShowing] = useState(false);
  const summary = session.attendanceSummary;

  async function setStatus(status) {
    try {
      await api.patch(`/trainings/${session._id}`, { status });
      onChanged();
    } catch (caught) {
      window.alert(caught.message || 'Could not update that session.');
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm truncate">{session.title}</h3>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
                STATUS_TONES[session.status]
              }`}
            >
              {session.status}
            </span>
            {session.provider === 'external' && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant shrink-0">
                External
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant mt-0.5">
            {shortDate(session.startsAt)} · {session.type.replace(/-/g, ' ')}
            {session.trainer ? ` · ${session.trainer}` : ''}
            {session.targetComponent ? ` · targets ${session.targetComponent}` : ''}
          </p>
        </div>

        <select
          value={session.status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label={`Status for ${session.title}`}
          className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2 py-1 text-xs font-bold capitalize cursor-pointer shrink-0"
        >
          {['planned', 'running', 'completed', 'cancelled'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-outline-variant/60">
        <div>
          <p className="text-sm font-black tabular-nums leading-none">{summary.attended}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-outline mt-1">
            Attended
          </p>
        </div>
        <div>
          <p className="text-sm font-black tabular-nums leading-none">{summary.rate}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-outline mt-1">
            Turnout
          </p>
        </div>
        <div>
          <p className="text-sm font-black tabular-nums leading-none">
            {session.cost ? rupees(session.cost) : '—'}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-outline mt-1">Cost</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowing((value) => !value)}
        className="text-xs font-bold text-primary hover:underline mt-3"
      >
        {showing ? 'Hide' : 'Did it work?'}
      </button>

      {showing && <Effectiveness sessionId={session._id} />}
    </div>
  );
}

/** Training sessions and whether they changed anything. */
export default function Training() {
  const { data, loading, error, refetch } = useApiResource('/trainings');
  const [adding, setAdding] = useState(false);

  if (loading && !data) return <LoadingBlock label="Loading training sessions" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { sessions, totals } = data;

  const refresh = () => {
    setAdding(false);
    refetch({ quiet: true });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { value: totals.sessions, label: 'Sessions' },
          { value: totals.completed, label: 'Completed' },
          {
            value: totals.studentsReached,
            label: 'Students reached',
            sub: 'distinct, not seats',
          },
          { value: totals.spend ? rupees(totals.spend) : '—', label: 'Total spend' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4"
          >
            <p className="text-2xl font-black font-headline tabular-nums leading-none">
              {stat.value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1.5">
              {stat.label}
            </p>
            {stat.sub && <p className="text-[10px] text-outline mt-0.5">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {adding ? (
        <NewSession onSaved={refresh} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
        >
          Schedule a session
        </button>
      )}

      {sessions.length === 0 ? (
        <EmptyBlock
          icon="school"
          title="No training recorded"
          description="Schedule a session and its effect on readiness is measured for you."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sessions.map((session) => (
            <SessionCard key={session._id} session={session} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
