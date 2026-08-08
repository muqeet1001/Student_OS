import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const STATUS_TONES = {
  prospect: 'bg-secondary-container text-on-secondary-container',
  active: 'bg-green-100 text-green-800',
  dormant: 'bg-surface-container text-on-surface-variant',
  lost: 'bg-error-container/25 text-on-error-container',
};

const STATUSES = ['prospect', 'active', 'dormant', 'lost'];

function formatCtc(value) {
  if (!value) return '—';
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  return `₹${(value / 100_000).toFixed(1)} LPA`;
}

const field =
  'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-outline';

function NewCompany({ onSaved, onCancel }) {
  const [form, setForm] = useState({ name: '', industry: '', location: '', status: 'prospect' });
  const [saving, setSaving] = useState(false);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/recruiters', form);
      onSaved();
    } catch (caught) {
      window.alert(caught.message || 'Could not add that company.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3"
    >
      <h3 className="font-headline text-base font-bold">Add a company</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className={labelClass}>Company</span>
          <input value={form.name} onChange={update('name')} required className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelClass}>Industry</span>
          <input value={form.industry} onChange={update('industry')} className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelClass}>Location</span>
          <input value={form.location} onChange={update('location')} className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelClass}>Status</span>
          <select
            value={form.status}
            onChange={update('status')}
            className={`${field} cursor-pointer`}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Add company'}
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

/** Records what a recruiter thought of the cohort they interviewed. */
function RecordFeedback({ recruiter, tags, onSaved, onCancel }) {
  const [form, setForm] = useState({ rating: 3, notes: '' });
  const [gaps, setGaps] = useState([]);
  const [strengths, setStrengths] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggle = (list, setList) => (key) =>
    setList(list.includes(key) ? list.filter((item) => item !== key) : [...list, key]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/recruiters/${recruiter._id}/feedback`, {
        rating: Number(form.rating),
        notes: form.notes,
        gaps,
        strengths,
      });
      onSaved();
    } catch (caught) {
      window.alert(caught.message || 'Could not save that feedback.');
    } finally {
      setSaving(false);
    }
  }

  const Chips = ({ selected, onToggle, tone }) => (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const on = selected.includes(tag.key);
        return (
          <button
            key={tag.key}
            type="button"
            onClick={() => onToggle(tag.key)}
            aria-pressed={on}
            className={`px-2.5 py-1 rounded-2xl text-[11px] font-bold border transition-colors ${
              on
                ? tone
                : 'border-outline-variant/60 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-outline-variant/60 space-y-3">
      <div className="flex items-center gap-3">
        <label className="space-y-1">
          <span className={labelClass}>Rating of the cohort</span>
          <select
            value={form.rating}
            onChange={(event) => setForm((c) => ({ ...c, rating: event.target.value }))}
            className={`${field} cursor-pointer`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} / 5
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1">
        <span className={labelClass}>What was strong</span>
        <Chips
          selected={strengths}
          onToggle={toggle(strengths, setStrengths)}
          tone="border-green-600/40 bg-green-100 text-green-800"
        />
      </div>

      <div className="space-y-1">
        <span className={labelClass}>What was weak</span>
        <Chips
          selected={gaps}
          onToggle={toggle(gaps, setGaps)}
          tone="border-error/40 bg-error-container/25 text-on-error-container"
        />
      </div>

      <label className="space-y-1 block">
        <span className={labelClass}>Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))}
          rows={2}
          className={field}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save feedback'}
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

function CompanyCard({ recruiter, tags, onChanged }) {
  const [giving, setGiving] = useState(false);
  const { health } = recruiter;

  async function setStatus(status) {
    try {
      await api.patch(`/recruiters/${recruiter._id}`, { status });
      onChanged();
    } catch (caught) {
      window.alert(caught.message || 'Could not update that company.');
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm truncate">{recruiter.name}</h3>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
                STATUS_TONES[recruiter.status]
              }`}
            >
              {recruiter.status}
            </span>
            {/*
             * Derived from the drives table, not from the status dropdown: a
             * relationship goes quiet without anyone remembering to change it.
             */}
            {health.stale && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl bg-error-container/25 text-on-error-container shrink-0">
                No recent visit
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant mt-0.5">
            {[recruiter.industry, recruiter.location].filter(Boolean).join(' · ') || 'No details'}
          </p>

          {recruiter.primaryContact && (
            <p className="text-xs text-outline mt-0.5 truncate">
              {recruiter.primaryContact.name}
              {recruiter.primaryContact.designation
                ? `, ${recruiter.primaryContact.designation}`
                : ''}
              {recruiter.primaryContact.email ? ` · ${recruiter.primaryContact.email}` : ''}
            </p>
          )}
        </div>

        <select
          value={recruiter.status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label={`Status for ${recruiter.name}`}
          className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2 py-1 text-xs font-bold capitalize cursor-pointer shrink-0"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-outline-variant/60">
        {[
          { value: health.visits, label: 'Visits' },
          { value: health.hired, label: 'Hired' },
          { value: `${health.conversionRate}%`, label: 'Conversion' },
          { value: formatCtc(health.averageCtc), label: 'Avg package' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-sm font-black tabular-nums leading-none">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-outline mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={() => setGiving((value) => !value)}
          className="text-xs font-bold text-primary hover:underline"
        >
          Record feedback
        </button>
        {recruiter.feedback?.length > 0 && (
          <span className="text-xs text-on-surface-variant">
            {recruiter.feedback.length} on file · last rated{' '}
            {recruiter.feedback.at(-1).rating}/5
          </span>
        )}
      </div>

      {giving && (
        <RecordFeedback
          recruiter={recruiter}
          tags={tags}
          onSaved={() => {
            setGiving(false);
            onChanged();
          }}
          onCancel={() => setGiving(false)}
        />
      )}
    </div>
  );
}

/** The placement office's own record of each hiring relationship. */
export default function Companies() {
  const { data, loading, error, refetch } = useApiResource('/recruiters');
  const [adding, setAdding] = useState(false);

  if (loading && !data) return <LoadingBlock label="Loading companies" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { recruiters, summary, recommendations, tags, totals } = data;

  const refresh = () => {
    setAdding(false);
    refetch({ quiet: true });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { value: totals.companies, label: 'Companies' },
          { value: totals.active, label: 'Active' },
          { value: totals.stale, label: 'No recent visit' },
          {
            value: summary.responses ? `${summary.rating.median}/5` : '—',
            label: 'Median rating',
            sub: summary.responses ? `${summary.responses} responses` : 'none yet',
          },
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

      {/*
       * What recruiters said leads the page. An internal metric saying
       * students are weak at communication is arguable; six named recruiters
       * saying it is not.
       */}
      {recommendations.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant mb-3">
            What recruiters keep telling you
          </h3>
          <ul className="space-y-2.5">
            {recommendations.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.priority === 'high' ? 'bg-error' : 'bg-primary'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{item.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(summary.gaps.length > 0 || summary.strengths.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Praised most', rows: summary.strengths, tone: 'bg-green-600' },
            { title: 'Criticised most', rows: summary.gaps, tone: 'bg-error' },
          ]
            .filter((block) => block.rows.length > 0)
            .map((block) => (
              <section
                key={block.title}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5"
              >
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant mb-3">
                  {block.title}
                </h3>
                <ul className="space-y-2">
                  {block.rows.slice(0, 6).map((row) => (
                    <li key={row.key}>
                      <div className="flex justify-between items-baseline text-xs mb-1">
                        <span className="font-bold truncate">{row.label}</span>
                        <span className="text-on-surface-variant tabular-nums shrink-0">
                          {row.recruiters}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${block.tone}`}
                          style={{
                            width: `${Math.round(
                              (row.recruiters / Math.max(1, block.rows[0].recruiters)) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {adding ? (
        <NewCompany onSaved={refresh} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
        >
          Add a company
        </button>
      )}

      {recruiters.length === 0 ? (
        <EmptyBlock
          icon="domain"
          title="No companies yet"
          description="Add the companies you recruit with and their feedback lands here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {recruiters.map((recruiter) => (
            <CompanyCard
              key={recruiter._id}
              recruiter={recruiter}
              tags={tags}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
