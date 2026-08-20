import React, { useEffect, useState } from 'react';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const COMPONENTS = ['skills', 'coding', 'resume', 'interview', 'projects'];
const input = 'mt-1 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm';

export default function AdminSettings() {
  const resource = useApiResource('/journey/institution');
  const filters = useApiResource('/admin/students/filters');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const config = resource.data?.institution;
    if (!config) return;
    setForm({
      name: config.name,
      placementSeasonName: config.placementSeasonName || '',
      activeGraduationYear: config.activeGraduationYear || filters.data?.graduationYears?.at(-1) || '',
      readinessWeights: { ...config.readinessWeights },
      skillTaxonomy: (config.skillTaxonomy ?? []).join(', '),
      enabledLocales: config.enabledLocales ?? ['en'],
      providers: { ...config.providers },
    });
  }, [filters.data?.graduationYears, resource.data?.institution]);

  if ((resource.loading && !resource.data) || !form) return <LoadingBlock label="Loading placement-office settings" />;
  if (resource.error) return <ErrorBlock error={resource.error} onRetry={resource.refetch} />;

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch('/journey/institution', {
        ...form,
        activeGraduationYear: Number(form.activeGraduationYear),
        readinessWeights: Object.fromEntries(COMPONENTS.map((key) => [key, Number(form.readinessWeights[key])])),
        skillTaxonomy: form.skillTaxonomy.split(',').map((item) => item.trim()).filter(Boolean),
      });
      await resource.refetch({ quiet: true });
    } catch (error) { window.alert(error.message || 'Could not save placement-office settings.'); }
    finally { setSaving(false); }
  }

  return <form onSubmit={save} className="space-y-5">
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Placement context</p><h2 className="font-headline text-xl font-black mt-1">Active season</h2><p className="text-xs text-on-surface-variant mt-1">This scope controls the default cohort, intervention queue and command centre.</p></div><div className="grid sm:grid-cols-3 gap-3"><label className="text-xs font-bold">Institution name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={input} /></label><label className="text-xs font-bold">Season label<input value={form.placementSeasonName} onChange={(event) => setForm({ ...form, placementSeasonName: event.target.value })} placeholder={`Placement season ${form.activeGraduationYear}`} className={input} /></label><label className="text-xs font-bold">Active graduating batch<select value={form.activeGraduationYear} onChange={(event) => setForm({ ...form, activeGraduationYear: event.target.value })} className={input}>{(filters.data?.graduationYears ?? []).map((year) => <option key={year} value={year}>Class of {year}</option>)}</select></label></div></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Readiness governance</p><h2 className="font-headline text-xl font-black mt-1">Evidence weights and taxonomy</h2></div><fieldset><legend className="text-xs font-bold mb-2">Weights must total 100</legend><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{COMPONENTS.map((key) => <label key={key} className="text-xs font-bold capitalize">{key}<input type="number" min="0" max="100" value={form.readinessWeights[key]} onChange={(event) => setForm({ ...form, readinessWeights: { ...form.readinessWeights, [key]: event.target.value } })} className={input} /></label>)}</div><p className={`text-xs mt-2 font-bold ${COMPONENTS.reduce((sum, key) => sum + Number(form.readinessWeights[key] || 0), 0) === 100 ? 'text-green-700' : 'text-error'}`}>Total: {COMPONENTS.reduce((sum, key) => sum + Number(form.readinessWeights[key] || 0), 0)}</p></fieldset><label className="block text-xs font-bold">College skill taxonomy<textarea rows="4" value={form.skillTaxonomy} onChange={(event) => setForm({ ...form, skillTaxonomy: event.target.value })} placeholder="Java, Python, React, SQL" className={input} /></label></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Integrations</p><h2 className="font-headline text-xl font-black mt-1">Delivery and roster providers</h2></div><div className="grid sm:grid-cols-3 gap-4"><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={form.providers.email} onChange={(event) => setForm({ ...form, providers: { ...form.providers, email: event.target.checked } })} />Email enabled</label><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={form.providers.whatsapp} onChange={(event) => setForm({ ...form, providers: { ...form.providers, whatsapp: event.target.checked } })} />WhatsApp enabled</label><label className="text-xs font-bold">Student information system<select value={form.providers.sis} onChange={(event) => setForm({ ...form, providers: { ...form.providers, sis: event.target.value } })} className={input}><option value="none">Not connected</option><option value="csv">CSV sync</option><option value="api">API managed</option></select></label></div></section>

    <div className="flex justify-end"><button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-black disabled:opacity-50">{saving ? 'Saving…' : 'Save placement settings'}</button></div>
  </form>;
}
