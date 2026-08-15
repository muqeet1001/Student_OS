import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const STATUS_TONES = {
  offered: 'bg-secondary-container text-on-secondary-container',
  accepted: 'bg-green-100 text-green-800',
  joined: 'bg-green-100 text-green-800',
  declined: 'bg-surface-container text-on-surface-variant',
  withdrawn: 'bg-error-container/25 text-on-error-container',
};

const STATUSES = ['offered', 'accepted', 'declined', 'joined', 'withdrawn'];

/** Indian formatting, since packages are quoted in lakhs. */
function formatCtc(value) {
  if (!value) return '—';
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  return `₹${(value / 100_000).toFixed(1)} LPA`;
}

function Metric({ value, label, sub }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
      <p className="text-2xl font-black font-headline tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1.5">
        {label}
      </p>
      {sub && <p className="text-[10px] text-outline mt-0.5">{sub}</p>}
    </div>
  );
}

function RecordOffer({ onSaved, onCancel }) {
  const { data: students } = useApiResource('/admin/students?limit=100&sort=name');
  const [form, setForm] = useState({ student: '', company: '', role: '', ctc: '', status: 'offered' });
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.ctc) payload.ctc = Number(payload.ctc);
      else delete payload.ctc;

      await api.post('/offers', payload);
      onSaved();
    } catch (caught) {
      window.alert(caught.message || 'Could not record that offer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3"
    >
      <h3 className="font-headline text-base font-bold">Record an offer</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">Student</span>
          <select
            value={form.student}
            onChange={update('student')}
            required
            className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-container"
          >
            <option value="">Select a student…</option>
            {(students?.students ?? []).map((student) => (
              <option key={student._id} value={student._id}>
                {student.name} — {student.email}
              </option>
            ))}
          </select>
        </label>

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

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            CTC (rupees per year)
          </span>
          <input
            type="number"
            min="0"
            value={form.ctc}
            onChange={update('ctc')}
            placeholder="800000"
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
          {saving ? 'Saving…' : 'Record offer'}
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

/** Offers and the placement report drawn from them. */
export default function Placements() {
  const report = useApiResource('/offers/report');
  const offers = useApiResource('/offers');
  const [recording, setRecording] = useState(false);

  if (report.loading && !report.data) return <LoadingBlock label="Building placement report" />;
  if (report.error) return <ErrorBlock error={report.error} onRetry={report.refetch} />;

  const { totals, salary, companies, branches } = report.data;
  const rows = offers.data?.offers ?? [];

  const refreshAll = () => {
    setRecording(false);
    report.refetch({ quiet: true });
    offers.refetch({ quiet: true });
  };

  async function setStatus(offerId, status) {
    try {
      await api.patch(`/offers/${offerId}`, { status });
      refreshAll();
    } catch (caught) {
      window.alert(caught.message || 'Could not update that offer.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          value={`${totals.placementRate}%`}
          label="Placement rate"
          sub={`${totals.placed} of ${totals.students} students`}
        />
        <Metric
          value={totals.offers}
          label="Offers made"
          sub={
            totals.offersPerPlacedStudent > 1
              ? `${totals.offersPerPlacedStudent} per placed student`
              : undefined
          }
        />
        <Metric
          value={formatCtc(salary.highest)}
          label="Highest package"
          sub={salary.reported ? `${salary.reported} reported` : 'none reported'}
        />
        <Metric
          value={formatCtc(salary.median)}
          label="Median package"
          sub={`average ${formatCtc(salary.average)}`}
        />
      </div>

      {recording ? (
        <RecordOffer onSaved={refreshAll} onCancel={() => setRecording(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setRecording(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
        >
          Record an offer
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {branches.length > 0 && (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
              Placement by department
            </h3>
            <ul className="space-y-2">
              {branches.map((branch) => (
                <li key={branch.branch}>
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-bold truncate">{branch.branch}</span>
                    <span className="text-on-surface-variant tabular-nums shrink-0">
                      {branch.placed}/{branch.students} · {branch.rate}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${branch.rate}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {companies.length > 0 && (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
              By company
            </h3>
            <ul className="space-y-1.5">
              {companies.map((company) => (
                <li key={company.company} className="flex justify-between text-xs">
                  <span className="font-bold truncate">{company.company}</span>
                  <span className="text-on-surface-variant tabular-nums shrink-0">
                    {company.placed} placed / {company.offers} offers
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
          All offers
        </h3>

        {rows.length === 0 ? (
          <EmptyBlock
            icon="sell"
            title="No offers recorded"
            description="Record one and the report above fills in."
          />
        ) : (
          <ul className="space-y-1.5">
            {rows.map((offer) => (
              <li
                key={offer._id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{offer.student?.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {offer.company} · {offer.role}
                    {offer.ctc ? ` · ${formatCtc(offer.ctc)}` : ''}
                  </p>
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
                    STATUS_TONES[offer.status]
                  }`}
                >
                  {offer.status}
                </span>

                <select
                  value={offer.status}
                  onChange={(event) => setStatus(offer._id, event.target.value)}
                  aria-label={`Status for ${offer.student?.name}`}
                  className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2 py-1 text-xs font-bold capitalize cursor-pointer shrink-0"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
