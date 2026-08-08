import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const TYPE_TONES = {
  drive: 'bg-primary/10 text-primary',
  test: 'bg-secondary-container text-on-secondary-container',
  interview: 'bg-blue-100 text-blue-800',
  'pre-placement-talk': 'bg-surface-container text-on-surface-variant',
  training: 'bg-green-100 text-green-800',
  deadline: 'bg-error-container/25 text-on-error-container',
};

const TYPES = ['drive', 'test', 'interview', 'pre-placement-talk', 'training', 'deadline'];

const time = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const longDay = (value) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** `datetime-local` needs a naive local string, not an ISO instant. */
function toLocalInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function NewEvent({ drives, onSaved, onCancel }) {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [form, setForm] = useState({
    title: '',
    type: 'drive',
    company: '',
    drive: '',
    venue: '',
    audience: 'shortlist',
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(new Date(start.getTime() + 3 * 60 * 60 * 1000)),
  });
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.drive) delete payload.drive;
      if (!payload.company) delete payload.company;
      // Sent as instants so the server is never guessing a timezone.
      payload.startsAt = new Date(form.startsAt).toISOString();
      payload.endsAt = new Date(form.endsAt).toISOString();

      await api.post('/calendar', payload);
      onSaved();
    } catch (caught) {
      window.alert(caught.message || 'Could not create that event.');
    } finally {
      setSaving(false);
    }
  }

  const field =
    'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
  const label = 'text-xs font-bold uppercase tracking-wider text-outline';

  return (
    <form
      onSubmit={submit}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3"
    >
      <h3 className="font-headline text-base font-bold">Add to the calendar</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="space-y-1 sm:col-span-2">
          <span className={label}>Title</span>
          <input value={form.title} onChange={update('title')} required className={field} />
        </label>

        <label className="space-y-1">
          <span className={label}>Type</span>
          <select value={form.type} onChange={update('type')} className={`${field} cursor-pointer`}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={label}>Company</span>
          <input value={form.company} onChange={update('company')} className={field} />
        </label>

        <label className="space-y-1">
          <span className={label}>Venue</span>
          <input value={form.venue} onChange={update('venue')} className={field} />
        </label>

        <label className="space-y-1">
          <span className={label}>Linked drive</span>
          <select
            value={form.drive}
            onChange={update('drive')}
            className={`${field} cursor-pointer`}
          >
            <option value="">None</option>
            {drives.map((drive) => (
              <option key={drive._id} value={drive._id}>
                {drive.company} — {drive.role}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={label}>Starts</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={update('startsAt')}
            required
            className={field}
          />
        </label>

        <label className="space-y-1">
          <span className={label}>Ends</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={update('endsAt')}
            required
            className={field}
          />
        </label>

        <label className="space-y-1">
          <span className={label}>Who sees it</span>
          <select
            value={form.audience}
            onChange={update('audience')}
            className={`${field} cursor-pointer`}
          >
            <option value="shortlist">Students with a slot</option>
            <option value="college">Everyone</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Add event'}
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

/** Generates interview slots for an event linked to a drive. */
function ScheduleSlots({ event, onDone, onCancel }) {
  const [form, setForm] = useState({
    startsAt: toLocalInput(new Date(event.startsAt)),
    durationMinutes: 30,
    panels: 2,
    venue: event.venue ?? '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(submitEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    try {
      const { scheduled } = await api.post(`/calendar/${event._id}/schedule`, {
        startsAt: new Date(form.startsAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        panels: Number(form.panels),
        venue: form.venue,
      });
      window.alert(`Scheduled ${scheduled} students.`);
      onDone();
    } catch (caught) {
      window.alert(caught.message || 'Could not build that schedule.');
    } finally {
      setSaving(false);
    }
  }

  const field =
    'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
  const label = 'text-xs font-bold uppercase tracking-wider text-outline';

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-outline-variant/60 space-y-3">
      <p className="text-xs text-on-surface-variant">
        Slots are built from the drive's shortlist, strongest match first. Regenerating replaces any
        existing slots.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className={label}>First slot</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => update('startsAt')(e.target.value)}
            required
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={label}>Minutes each</span>
          <input
            type="number"
            min="5"
            max="240"
            value={form.durationMinutes}
            onChange={(e) => update('durationMinutes')(e.target.value)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={label}>Panels</span>
          <input
            type="number"
            min="1"
            max="20"
            value={form.panels}
            onChange={(e) => update('panels')(e.target.value)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={label}>Venue</span>
          <input
            value={form.venue}
            onChange={(e) => update('venue')(e.target.value)}
            className={field}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Building…' : 'Build schedule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EventCard({ event, onChanged }) {
  const [open, setOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  async function markSlot(slotId, status) {
    try {
      await api.patch(`/calendar/${event._id}/slots/${slotId}`, { status });
      onChanged();
    } catch (caught) {
      window.alert(caught.message || 'Could not update that slot.');
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm truncate">{event.title}</h3>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
                TYPE_TONES[event.type]
              }`}
            >
              {event.type.replace(/-/g, ' ')}
            </span>
            {event.audience === 'college' && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant shrink-0">
                Everyone
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant mt-0.5">
            {time(event.startsAt)}–{time(event.endsAt)}
            {event.venue ? ` · ${event.venue}` : ''}
            {event.company ? ` · ${event.company}` : ''}
          </p>
        </div>

        {event.slots?.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-xs font-bold text-primary shrink-0 hover:underline"
          >
            {event.slots.length} slots
          </button>
        )}

        {event.drive && (
          <button
            type="button"
            onClick={() => setScheduling((value) => !value)}
            className="text-xs font-bold text-on-surface-variant shrink-0 hover:text-primary"
          >
            Schedule
          </button>
        )}
      </div>

      {scheduling && (
        <ScheduleSlots
          event={event}
          onDone={() => {
            setScheduling(false);
            onChanged();
          }}
          onCancel={() => setScheduling(false)}
        />
      )}

      {open && event.slots?.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-outline-variant/60 space-y-1">
          {event.slots.map((slot) => (
            <li key={slot._id} className="flex items-center gap-2 text-xs">
              <span className="tabular-nums text-on-surface-variant w-12 shrink-0">
                {time(slot.startsAt)}
              </span>
              <span className="text-outline w-14 shrink-0">Panel {slot.panel}</span>
              <span className="font-bold truncate flex-1">{slot.student?.name ?? 'Student'}</span>

              <select
                value={slot.status}
                onChange={(changed) => markSlot(slot._id, changed.target.value)}
                aria-label={`Attendance for ${slot.student?.name ?? 'student'}`}
                className="bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-0.5 text-xs font-bold cursor-pointer shrink-0"
              >
                <option value="scheduled">scheduled</option>
                <option value="attended">attended</option>
                <option value="no-show">no-show</option>
                <option value="cancelled">cancelled</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The placement calendar, with double-bookings surfaced at the top. */
export default function Calendar() {
  const calendar = useApiResource('/calendar');
  const { data: driveData } = useApiResource('/drives');
  const [adding, setAdding] = useState(false);

  if (calendar.loading && !calendar.data) return <LoadingBlock label="Loading the calendar" />;
  if (calendar.error) return <ErrorBlock error={calendar.error} onRetry={calendar.refetch} />;

  const { days, conflicts } = calendar.data;
  const drives = driveData?.drives ?? [];

  const refresh = () => {
    setAdding(false);
    calendar.refetch({ quiet: true });
  };

  return (
    <div className="space-y-4">
      {/*
       * Clashes lead, rather than sitting behind a check the officer has to
       * remember to run. The realistic case is one student shortlisted by two
       * companies visiting the same morning.
       */}
      {conflicts.length > 0 && (
        <section className="bg-error-container/15 border border-error/30 rounded-xl p-4">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-on-error-container">
            {conflicts.length} double-booked {conflicts.length === 1 ? 'student' : 'students'}
          </h3>
          <ul className="mt-2 space-y-1">
            {conflicts.map((clash, index) => (
              <li key={`${clash.student}-${index}`} className="text-xs">
                <span className="font-bold">{clash.a.student?.name ?? 'A student'}</span>
                <span className="text-on-surface-variant">
                  {' '}
                  — {clash.a.eventTitle} at {time(clash.a.startsAt)} overlaps {clash.b.eventTitle} at{' '}
                  {time(clash.b.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding ? (
        <NewEvent drives={drives} onSaved={refresh} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
        >
          Add to the calendar
        </button>
      )}

      {days.length === 0 ? (
        <EmptyBlock
          icon="event"
          title="Nothing scheduled"
          description="Add a drive, a test or a talk and it appears here."
        />
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <section key={day.day}>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant mb-2">
                {longDay(day.day)}
              </h2>
              <div className="space-y-2">
                {day.events.map((event) => (
                  <EventCard key={event._id} event={event} onChanged={refresh} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
