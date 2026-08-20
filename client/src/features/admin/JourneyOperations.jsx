import React, { useEffect, useState } from 'react';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const COMPONENTS = ['skills', 'coding', 'resume', 'interview', 'projects'];

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(value); value = ''; }
    else value += character;
  }
  cells.push(value);
  return cells;
}

export default function JourneyOperations() {
  const operations = useApiResource('/journey/staff');
  const institution = useApiResource('/journey/institution');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const config = institution.data?.institution;
    if (!config) return;
    setForm({
      name: config.name,
      readinessWeights: { ...config.readinessWeights },
      skillTaxonomy: (config.skillTaxonomy ?? []).join(', '),
      enabledLocales: config.enabledLocales ?? ['en'],
      providers: { ...config.providers },
    });
  }, [institution.data?.institution]);

  if ((operations.loading && !operations.data) || (institution.loading && !institution.data)) {
    return <LoadingBlock label="Loading journey operations" />;
  }
  if (operations.error && !operations.data) return <ErrorBlock error={operations.error} onRetry={operations.refetch} />;

  async function schedule(appointment, status = 'scheduled') {
    const startsAt = status === 'scheduled'
      ? window.prompt('Meeting date and time (for example 2026-09-01 15:30)', appointment.startsAt || '')
      : appointment.startsAt;
    if (status === 'scheduled' && !startsAt) return;
    setBusy(appointment._id);
    try {
      await api.patch(`/journey/mentoring/${appointment._id}`, { status, startsAt: startsAt || null });
      await operations.refetch({ quiet: true });
    } catch (error) { window.alert(error.message || 'Could not update the mentoring request.'); }
    finally { setBusy(''); }
  }

  async function saveInstitution(event) {
    event.preventDefault();
    setBusy('institution');
    try {
      const readinessWeights = Object.fromEntries(
        COMPONENTS.map((key) => [key, Number(form.readinessWeights[key])]),
      );
      await api.patch('/journey/institution', {
        ...form,
        readinessWeights,
        skillTaxonomy: form.skillTaxonomy.split(',').map((item) => item.trim()).filter(Boolean),
      });
      await institution.refetch({ quiet: true });
      window.alert('Institution settings saved. New readiness calculations will use these weights.');
    } catch (error) { window.alert(error.message || 'Could not save institution settings.'); }
    finally { setBusy(''); }
  }

  async function exportRoster() {
    try {
      const response = await api.raw('/journey/sis/export.csv');
      const url = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = 'student-os-sis-roster.csv'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) { window.alert(error.message || 'Could not export the SIS roster.'); }
  }

  async function importRoster(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      const headers = parseCsvLine(lines.shift()).map((item) => item.trim());
      const rows = lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index]?.trim() || undefined])));
      const result = await api.post('/journey/sis/sync', { rows });
      window.alert(`SIS sync complete: ${result.updated.length} updated, ${result.unmatched.length} unmatched.`);
    } catch (error) { window.alert(error.message || 'Could not import that SIS roster.'); }
  }

  const appointments = operations.data?.appointments ?? [];
  const actions = operations.data?.actions ?? [];

  return <div className="grid xl:grid-cols-2 gap-5">
    <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4">
      <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Mentoring</p><h2 className="font-headline text-xl font-black">Requests and appointments</h2></div>
      <div className="divide-y divide-outline-variant/60">
        {appointments.map((item) => <article key={item._id} className="py-4 flex gap-3 items-start">
          <div className="min-w-0 flex-1"><p className="font-bold text-sm">{item.student?.name || 'Student'} · {item.topic}</p><p className="text-xs text-on-surface-variant mt-1">{item.note || 'No note'}{item.startsAt ? ` · ${new Date(item.startsAt).toLocaleString('en-IN')}` : ''}</p><span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-surface-container text-[10px] uppercase font-black">{item.status}</span></div>
          <div className="flex gap-1.5">{item.status === 'requested' && <button type="button" disabled={busy === item._id} onClick={() => schedule(item)} className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold">Schedule</button>}{item.status === 'scheduled' && <button type="button" disabled={busy === item._id} onClick={() => schedule(item, 'completed')} className="px-3 py-1.5 rounded-full bg-surface-container text-xs font-bold">Complete</button>}</div>
        </article>)}
        {appointments.length === 0 && <p className="py-6 text-sm text-on-surface-variant">No mentoring requests yet.</p>}
      </div>
      <p className="text-xs text-on-surface-variant">{actions.length} staff-assigned student action{actions.length === 1 ? '' : 's'} recorded.</p>
    </section>

    {form && <form onSubmit={saveInstitution} className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4">
      <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Institution configuration</p><h2 className="font-headline text-xl font-black">Localise Student OS</h2></div>
      <label className="block text-xs font-bold">Institution name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 bg-transparent text-sm" /></label>
      <fieldset><legend className="text-xs font-bold mb-2">Readiness weights (must total 100)</legend><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{COMPONENTS.map((key) => <label key={key} className="text-[11px] capitalize">{key}<input type="number" min="0" max="100" value={form.readinessWeights[key]} onChange={(event) => setForm({ ...form, readinessWeights: { ...form.readinessWeights, [key]: event.target.value } })} className="mt-1 w-full rounded-lg border border-outline-variant px-2 py-2 bg-transparent text-sm" /></label>)}</div><p className="text-[11px] text-on-surface-variant mt-2">Total: {COMPONENTS.reduce((sum, key) => sum + Number(form.readinessWeights[key] || 0), 0)}</p></fieldset>
      <label className="block text-xs font-bold">College skill taxonomy<textarea rows="3" value={form.skillTaxonomy} onChange={(event) => setForm({ ...form, skillTaxonomy: event.target.value })} placeholder="Java, Python, React, SQL" className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 bg-transparent text-sm" /></label>
      <fieldset><legend className="text-xs font-bold mb-2">Student languages</legend><div className="flex gap-4">{[['en', 'English'], ['hi', 'Hindi']].map(([key, label]) => <label key={key} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.enabledLocales.includes(key)} onChange={(event) => setForm({ ...form, enabledLocales: event.target.checked ? [...new Set([...form.enabledLocales, key])] : form.enabledLocales.filter((item) => item !== key) })} />{label}</label>)}</div></fieldset>
      <fieldset><legend className="text-xs font-bold mb-2">Provider capability</legend><div className="grid sm:grid-cols-3 gap-3"><label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.providers.email} onChange={(event) => setForm({ ...form, providers: { ...form.providers, email: event.target.checked } })} />Email</label><label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.providers.whatsapp} onChange={(event) => setForm({ ...form, providers: { ...form.providers, whatsapp: event.target.checked } })} />WhatsApp</label><label className="text-sm">SIS<select value={form.providers.sis} onChange={(event) => setForm({ ...form, providers: { ...form.providers, sis: event.target.value } })} className="ml-2 rounded-lg border border-outline-variant px-2 py-1 bg-transparent"><option value="none">None</option><option value="csv">CSV</option><option value="api">API</option></select></label></div><p className="text-[11px] text-on-surface-variant mt-2">Capabilities describe connected providers; credentials stay in server environment variables.</p>{form.providers.sis !== 'none' && <div className="flex gap-2 mt-3"><button type="button" onClick={exportRoster} className="px-3 py-1.5 rounded-full bg-surface-container text-xs font-bold">Export roster CSV</button><label className="px-3 py-1.5 rounded-full bg-surface-container text-xs font-bold cursor-pointer">Import roster CSV<input type="file" accept=".csv,text/csv" onChange={importRoster} className="sr-only" /></label></div>}</fieldset>
      <button type="submit" disabled={busy === 'institution'} className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold disabled:opacity-50">Save configuration</button>
    </form>}
  </div>;
}
