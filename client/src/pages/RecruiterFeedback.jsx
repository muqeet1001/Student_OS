import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

export default function RecruiterFeedback() {
  const { token } = useParams();
  const { data, loading, error, refetch } = useApiResource(`/recruiter-portal/${token}`);
  const [form, setForm] = useState({ rating: 4, strengths: [], gaps: [], notes: '' });
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = (field, key) => setForm((current) => ({ ...current, [field]: current[field].includes(key) ? current[field].filter((item) => item !== key) : [...current[field], key] }));
  async function submit(event) { event.preventDefault(); setBusy(true); try { await api.post(`/recruiter-portal/${token}`, form); setComplete(true); } catch (caught) { window.alert(caught.message || 'Could not submit feedback.'); } finally { setBusy(false); } }
  if (loading && !data) return <LoadingBlock label="Opening feedback form" className="min-h-dvh" />;
  if (error && !data) return <main className="min-h-dvh p-6 flex items-center justify-center"><div className="max-w-lg"><ErrorBlock error={error} onRetry={refetch} /></div></main>;
  if (complete) return <main className="min-h-dvh bg-background flex items-center justify-center p-6"><section className="max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/60 p-8 text-center"><span className="material-symbols-outlined text-4xl text-green-700">check_circle</span><h1 className="font-headline text-2xl font-black mt-3">Thank you</h1><p className="text-sm text-on-surface-variant mt-2">Your feedback will help the placement office fund the right preparation.</p></section></main>;
  return <main className="min-h-dvh bg-background text-on-surface p-5"><form onSubmit={submit} className="max-w-2xl mx-auto rounded-2xl bg-surface-container-lowest border border-outline-variant/60 p-6 md:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Recruiter feedback</p><h1 className="font-headline text-2xl font-black mt-2">Help {data.company} shape preparation</h1><p className="text-sm text-on-surface-variant mt-1">Choose observable cohort strengths and gaps. The link accepts one response and expires automatically.</p><label className="block mt-6 text-sm font-bold">Overall cohort rating: {form.rating}/5<input type="range" min="1" max="5" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))} className="w-full mt-2 accent-primary" /></label>{[['strengths', 'What was strong?'], ['gaps', 'What needs investment?']].map(([field, title]) => <fieldset key={field} className="mt-5"><legend className="text-sm font-bold">{title}</legend><div className="flex flex-wrap gap-2 mt-2">{data.tags.map((tag) => <button key={tag.key} type="button" aria-pressed={form[field].includes(tag.key)} onClick={() => toggle(field, tag.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${form[field].includes(tag.key) ? 'bg-primary text-on-primary' : 'bg-surface-container'}`}>{tag.label}</button>)}</div></fieldset>)}<label className="block mt-5 text-sm font-bold">Additional notes<textarea rows="4" maxLength="2000" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full mt-2 rounded-xl bg-surface-container-low p-4 text-sm" /></label><button disabled={busy} className="mt-5 px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm disabled:opacity-50">{busy ? 'Submitting…' : 'Submit feedback'}</button></form></main>;
}
