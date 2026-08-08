import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const STATUS_TONES = {
  planned: 'bg-surface-container text-on-surface-variant',
  open: 'bg-green-100 text-green-800',
  'in-progress': 'bg-secondary-container text-on-secondary-container',
  closed: 'bg-surface-container text-outline',
};

const PIPELINE = ['shortlisted', 'assessment', 'interview', 'selected', 'rejected'];

function NewDriveForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    company: '',
    role: '',
    description: '',
    minReadiness: 0,
    package: '',
    driveDate: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, minReadiness: Number(form.minReadiness) };
      if (!payload.driveDate) delete payload.driveDate;
      if (!payload.package) delete payload.package;

      const result = await api.post('/drives', payload);
      onCreated(result.drive);
    } catch (caught) {
      window.alert(caught.message || 'Could not create that drive.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3"
    >
      <h2 className="font-headline text-base font-bold">New placement drive</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">Company</span>
          <input
            value={form.company}
            onChange={update('company')}
            required
            className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">Role</span>
          <input
            value={form.role}
            onChange={update('role')}
            required
            className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-outline">
          Requirement / job description
        </span>
        <textarea
          value={form.description}
          onChange={update('description')}
          required
          minLength={20}
          rows={5}
          placeholder="Required: Java, data structures, DBMS. Minimum CGPA 7.0. CSE and IT, graduating 2026."
          className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Min readiness
          </span>
          <input
            type="number"
            min="0"
            max="100"
            value={form.minReadiness}
            onChange={update('minReadiness')}
            className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">Package</span>
          <input
            value={form.package}
            onChange={update('package')}
            placeholder="₹8 LPA"
            className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">Drive date</span>
          <input
            type="date"
            value={form.driveDate}
            onChange={update('driveDate')}
            className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create and find candidates'}
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

function DriveDetail({ driveId, onBack }) {
  const { data, loading, error, refetch } = useApiResource(`/drives/${driveId}`);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [onlyEligible, setOnlyEligible] = useState(true);

  if (loading && !data) return <LoadingBlock label="Finding candidates" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { drive, candidates, summary } = data;
  const visible = onlyEligible ? candidates.filter((item) => item.eligible) : candidates;

  const toggle = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function shortlist() {
    setBusy(true);
    try {
      await api.post(`/drives/${driveId}/shortlist`, { studentIds: [...selected] });
      setSelected(new Set());
      await refetch({ quiet: true });
    } catch (caught) {
      window.alert(caught.message || 'Could not shortlist those students.');
    } finally {
      setBusy(false);
    }
  }

  async function setStage(studentId, stage) {
    setBusy(true);
    try {
      await api.patch(`/drives/${driveId}/shortlist/${studentId}`, { stage });
      await refetch({ quiet: true });
    } catch (caught) {
      window.alert(caught.message || 'Could not update that student.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant hover:text-primary"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        All drives
      </button>

      <header className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-lg font-bold">
              {drive.company} — {drive.role}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {[drive.package, drive.location, drive.driveDate && new Date(drive.driveDate).toLocaleDateString()]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <a
            href={`/api/drives/${driveId}/export`}
            className="px-4 py-2 rounded-lg bg-surface-container font-bold text-sm hover:bg-surface-container-high"
          >
            Export shortlist
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-outline-variant/60">
          {[
            ['Considered', summary.considered],
            ['Eligible', summary.eligible],
            ['Strong match', summary.strong],
            ['Shortlisted', summary.shortlisted],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-lg font-black tabular-nums leading-none">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* Shortlist */}
      {drive.shortlist.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
            Shortlist ({drive.shortlist.length})
          </h3>

          <ul className="space-y-1.5">
            {candidates
              .filter((item) => item.shortlisted)
              .map((item) => (
                <li
                  key={item._id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {item.branch} · {item.match.score}% match
                    </p>
                  </div>

                  <select
                    value={item.shortlisted.stage}
                    disabled={busy}
                    onChange={(event) => setStage(item._id, event.target.value)}
                    aria-label={`Stage for ${item.name}`}
                    className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2 py-1 text-xs font-bold capitalize cursor-pointer shrink-0"
                  >
                    {PIPELINE.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Candidate pool */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Candidates
          </h3>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(event) => setOnlyEligible(event.target.checked)}
                className="w-4 h-4 rounded-md cursor-pointer"
              />
              Eligible only
            </label>

            {selected.size > 0 && (
              <button
                type="button"
                onClick={shortlist}
                disabled={busy}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs disabled:opacity-60"
              >
                Shortlist {selected.size}
              </button>
            )}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyBlock
            icon="person_search"
            title="No eligible candidates"
            description="Loosen the requirement, or clear the eligible-only filter to see near misses."
          />
        ) : (
          <ul className="space-y-1.5">
            {visible.slice(0, 50).map((item) => (
              <li
                key={item._id}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  item.shortlisted ? 'bg-primary/5' : 'bg-surface-container-low'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item._id)}
                  disabled={Boolean(item.shortlisted)}
                  onChange={() => toggle(item._id)}
                  aria-label={`Select ${item.name}`}
                  className="w-4 h-4 rounded-md cursor-pointer shrink-0 disabled:opacity-40"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {[item.branch, item.graduationYear].filter(Boolean).join(' · ')} ·{' '}
                    {item.verifiedSkills} verified · {item.solved} solved
                  </p>
                </div>

                {/* A near miss is shown with its reason rather than hidden. */}
                {!item.eligible && item.match.blockers.length > 0 && (
                  <span className="hidden md:block text-[10px] text-on-error-container bg-error-container/20 px-2 py-0.5 rounded-2xl shrink-0 max-w-[14rem] truncate">
                    {item.match.blockers[0]}
                  </span>
                )}

                <span className="text-sm font-black tabular-nums w-12 text-right shrink-0">
                  {item.match.score}%
                </span>

                {item.shortlisted && (
                  <span className="text-[10px] font-black uppercase text-primary shrink-0">
                    listed
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Placement drives: create one, see who qualifies, shortlist in bulk. */
export default function Drives() {
  const { data, loading, error, refetch } = useApiResource('/drives');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  if (openId) return <DriveDetail driveId={openId} onBack={() => setOpenId(null)} />;

  const drives = data?.drives ?? [];

  return (
    <div className="space-y-3">
      {creating ? (
        <NewDriveForm
          onCancel={() => setCreating(false)}
          onCreated={(drive) => {
            setCreating(false);
            refetch({ quiet: true });
            setOpenId(drive._id);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
        >
          New drive
        </button>
      )}

      {loading && !data && <LoadingBlock label="Loading drives" />}
      {error && <ErrorBlock error={error} onRetry={refetch} />}

      {!loading && drives.length === 0 && !creating && (
        <EmptyBlock
          icon="event"
          title="No drives yet"
          description="Create one and the system finds every eligible student against its requirement."
        />
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {drives.map((drive) => (
          <li key={drive._id}>
            <button
              type="button"
              onClick={() => setOpenId(drive._id)}
              className="w-full text-left bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-bold text-sm truncate">{drive.company}</span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
                    STATUS_TONES[drive.status]
                  }`}
                >
                  {drive.status}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant truncate">{drive.role}</p>

              <div className="flex gap-4 mt-3 pt-2 border-t border-outline-variant/60 text-xs">
                <span>
                  <strong className="tabular-nums">{drive.shortlistCount}</strong>{' '}
                  <span className="text-on-surface-variant">shortlisted</span>
                </span>
                <span>
                  <strong className="tabular-nums">{drive.selectedCount}</strong>{' '}
                  <span className="text-on-surface-variant">selected</span>
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
