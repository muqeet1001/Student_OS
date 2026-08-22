import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const field =
  'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-outline';
const TEMPLATES = [
  { label: 'Interview reminder', subject: 'Interview reminder: action required', body: 'Your interview schedule has been published. Review your slot, venue and preparation instructions in Student OS.' },
  { label: 'Drive update', subject: 'Placement drive update', body: 'There is an important update to your placement drive. Open Student OS to review the latest timeline and required action.' },
  { label: 'Selected candidates', subject: 'Selection update', body: 'Your placement status has changed. Open Student OS to review the official outcome and next steps.' },
  { label: 'Missing evidence', subject: 'Complete your placement record', body: 'Your placement record is missing required evidence. Please complete the highlighted fields before the deadline.' },
];

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Composing an announcement.
 *
 * The preview is a required step rather than a convenience: sending to the
 * wrong group cannot be undone, so the officer sees the count and a few real
 * names before the button that commits.
 */
function Composer({ audienceTypes, filters, onSent, onCancel, defaultYear }) {
  const [form, setForm] = useState({ subject: '', body: '' });
  const [audience, setAudience] = useState(defaultYear ? { type: 'year', graduationYear: defaultYear } : { type: 'all' });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  // Any change to the targeting invalidates the preview, so the count on
  // screen can never belong to a different filter than the one about to send.
  const retarget = (next) => {
    setAudience(next);
    setPreview(null);
  };

  async function runPreview() {
    setBusy(true);
    try {
      setPreview(await api.post('/announcements/preview', audience));
    } catch (caught) {
      window.alert(caught.message || 'Could not work out that audience.');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!window.confirm(`Send to ${preview.count} students? This cannot be undone.`)) return;

    setBusy(true);
    try {
      const result = await api.post('/announcements', { ...form, audience });
      const { delivery } = result;

      window.alert(
        delivery.sent > 0
          ? `Sent to ${delivery.sent} students by email${delivery.failed ? `, ${delivery.failed} failed` : ''}.`
          : `Posted to ${delivery.total} students in the app. No email was sent — ${result.email.reason}`,
      );
      onSent();
    } catch (caught) {
      window.alert(caught.message || 'Could not send that.');
    } finally {
      setBusy(false);
    }
  }

  const ready = form.subject.trim() && form.body.trim() && preview?.count > 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3">
      <h3 className="font-headline text-base font-bold">New announcement</h3>

      <label className="space-y-1 block"><span className={labelClass}>Start from a template</span><select defaultValue="" onChange={(event) => { const template = TEMPLATES[Number(event.target.value)]; if (template) setForm({ subject: template.subject, body: template.body }); }} className={field}><option value="">Blank message</option>{TEMPLATES.map((template, index) => <option key={template.label} value={index}>{template.label}</option>)}</select></label>

      <label className="space-y-1 block">
        <span className={labelClass}>Subject</span>
        <input value={form.subject} onChange={update('subject')} required className={field} />
      </label>

      <label className="space-y-1 block">
        <span className={labelClass}>Message</span>
        <textarea value={form.body} onChange={update('body')} rows={5} required className={field} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={labelClass}>Send to</span>
          <select
            value={audience.type}
            onChange={(event) => retarget({ type: event.target.value })}
            className={`${field} cursor-pointer`}
          >
            {audienceTypes
              .filter((type) => type.key !== 'selected' && type.key !== 'drive')
              .map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
          </select>
        </label>

        {audience.type === 'branch' && (
          <label className="space-y-1">
            <span className={labelClass}>Department</span>
            <select
              value={audience.branch ?? ''}
              onChange={(event) => retarget({ type: 'branch', branch: event.target.value })}
              className={`${field} cursor-pointer`}
            >
              <option value="">Choose…</option>
              {(filters?.branches ?? []).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
        )}

        {audience.type === 'year' && (
          <label className="space-y-1">
            <span className={labelClass}>Batch</span>
            <select
              value={audience.graduationYear ?? ''}
              onChange={(event) =>
                retarget({ type: 'year', graduationYear: Number(event.target.value) })
              }
              className={`${field} cursor-pointer`}
            >
              <option value="">Choose…</option>
              {(filters?.graduationYears ?? []).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        )}

        {audience.type === 'band' && (
          <label className="space-y-1">
            <span className={labelClass}>Readiness band</span>
            <select
              value={audience.band ?? ''}
              onChange={(event) => retarget({ type: 'band', band: event.target.value })}
              className={`${field} cursor-pointer`}
            >
              <option value="">Choose…</option>
              <option value="ready">Ready</option>
              <option value="progressing">Progressing</option>
              <option value="at-risk">At risk</option>
            </select>
          </label>
        )}
      </div>

      {preview && (
        <div className="bg-surface-container-low rounded-lg p-3">
          {preview.count === 0 ? (
            <p className="text-xs font-bold text-on-error-container">
              {preview.reason ?? 'That matches no students.'}
            </p>
          ) : (
            <>
              <p className="text-sm font-bold">
                {preview.count} {preview.count === 1 ? 'student' : 'students'} — {preview.description}
              </p>
              <p className="text-[11px] text-outline mt-0.5">
                {preview.sample.map((row) => row.name).join(', ')}
                {preview.count > preview.sample.length ? ' and others' : ''}
              </p>
              {!preview.email.available && (
                <p className="text-[11px] text-on-surface-variant mt-1.5">{preview.email.reason}</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={runPreview}
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-surface-container font-bold text-sm hover:bg-surface-container-high disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Check who this reaches'}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={busy || !ready}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-40"
        >
          Send
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Announcements the office has sent, and what happened to them. */
export default function Announcements({ graduationYear = '' }) {
  const { data, loading, error, refetch } = useApiResource('/announcements');
  const { data: filters } = useApiResource('/admin/students/filters');
  const [composing, setComposing] = useState(false);
  const [retrying, setRetrying] = useState('');

  if (loading && !data) return <LoadingBlock label="Loading announcements" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { announcements, audienceTypes, email } = data;

  async function retry(announcementId) {
    setRetrying(announcementId);
    try { const result = await api.post(`/announcements/${announcementId}/retry`, {}); window.alert(`Retry complete: ${result.delivery.sent} sent, ${result.delivery.failed} failed.`); await refetch({ quiet: true }); }
    catch (caught) { window.alert(caught.message || 'Could not retry delivery.'); }
    finally { setRetrying(''); }
  }

  return (
    <div className="space-y-4">
      {/*
        Said up front, not discovered after sending. An officer who believes
        a drive announcement went out by email, and finds on the morning that
        it did not, has been actively harmed by the software.
      */}
      {!email.available && (
        <p className="bg-secondary-container/40 border border-outline-variant/60 rounded-xl px-4 py-3 text-xs">
          <span className="font-bold">Email is not configured. </span>
          {email.reason}
        </p>
      )}

      {composing ? (
        <Composer
          audienceTypes={audienceTypes}
          filters={filters}
          defaultYear={graduationYear}
          onSent={() => {
            setComposing(false);
            refetch({ quiet: true });
          }}
          onCancel={() => setComposing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
        >
          Write an announcement
        </button>
      )}

      {announcements.length === 0 ? (
        <EmptyBlock
          icon="campaign"
          title="Nothing sent yet"
          description="Announcements you send appear here with their delivery record."
        />
      ) : (
        <ul className="space-y-2">
          {announcements.map((announcement) => (
            <li
              key={announcement._id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm">{announcement.subject}</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {shortDate(announcement.sentAt)} · {announcement.audience.description} ·{' '}
                    {announcement.sentBy?.name ?? 'Placement office'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-black tabular-nums">
                    {announcement.delivery.read}/{announcement.delivery.total}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">read</p>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant mt-2 line-clamp-2">
                {announcement.body}
              </p>

              <p className="text-[11px] text-outline mt-2">
                {announcement.delivery.sent > 0 && `${announcement.delivery.sent} emailed`}
                {announcement.delivery.failed > 0 &&
                  `${announcement.delivery.sent > 0 ? ' · ' : ''}${announcement.delivery.failed} failed`}
                {announcement.delivery.skipped > 0 &&
                  `${announcement.delivery.sent + announcement.delivery.failed > 0 ? ' · ' : ''}${
                    announcement.delivery.skipped
                  } in-app only`}
              </p>
              {announcement.delivery.failed > 0 && email.available && <button type="button" disabled={retrying === announcement._id} onClick={() => retry(announcement._id)} className="mt-2 rounded-lg bg-error-container/25 text-on-error-container px-3 py-1.5 text-[10px] font-black">{retrying === announcement._id ? 'Retrying…' : `Retry ${announcement.delivery.failed} failed`}</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
