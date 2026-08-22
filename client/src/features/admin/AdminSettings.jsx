import React, { useEffect, useState } from 'react';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

const COMPONENTS = ['skills', 'coding', 'resume', 'interview', 'projects'];
const input = 'mt-1 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm';

function parseCsvLine(line) {
  const cells = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(value); value = ''; }
    else value += character;
  }
  cells.push(value); return cells;
}

export default function AdminSettings() {
  const resource = useApiResource('/journey/institution');
  const filters = useApiResource('/admin/students/filters');
  const staff = useApiResource('/admin/staff');
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
      placementPolicies: { maximumActiveOffers: 0, dreamPackage: 0, superDreamPackage: 0, minimumPackageImprovementPct: 0, debarAfterNoShows: 0, allowWithdrawal: true, ...config.placementPolicies },
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

  async function exportRoster() {
    try {
      const response = await api.raw('/journey/sis/export.csv');
      const url = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'student-os-sis-roster.csv'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) { window.alert(error.message || 'Could not export the roster.'); }
  }

  async function importRoster(event) {
    const [file] = event.target.files; event.target.value = ''; if (!file) return;
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      const headers = parseCsvLine(lines.shift()).map((item) => item.trim());
      const required = ['externalStudentId', 'email'];
      if (required.some((key) => !headers.includes(key))) throw new Error('CSV must include externalStudentId and email columns.');
      const rows = lines.map((line) => { const cells = parseCsvLine(line); return Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() || undefined])); });
      const result = await api.post('/journey/sis/sync', { rows });
      window.alert(`Import checked ${result.total} rows: ${result.updated.length} updated and ${result.unmatched.length} unmatched.`);
    } catch (error) { window.alert(error.message || 'Could not import that CSV.'); }
  }

  async function changeRole(staffId, staffRole) {
    try { await api.patch(`/admin/staff/${staffId}/role`, { staffRole }); await staff.refetch({ quiet: true }); }
    catch (error) { window.alert(error.message || 'Could not update permissions.'); }
  }

  return <form onSubmit={save} className="space-y-5">
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Placement context</p><h2 className="font-headline text-xl font-black mt-1">Active season</h2><p className="text-xs text-on-surface-variant mt-1">This scope controls the default cohort, intervention queue and command centre.</p></div><div className="grid sm:grid-cols-3 gap-3"><label className="text-xs font-bold">Institution name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={input} /></label><label className="text-xs font-bold">Season label<input value={form.placementSeasonName} onChange={(event) => setForm({ ...form, placementSeasonName: event.target.value })} placeholder={`Placement season ${form.activeGraduationYear}`} className={input} /></label><label className="text-xs font-bold">Active graduating batch<select value={form.activeGraduationYear} onChange={(event) => setForm({ ...form, activeGraduationYear: event.target.value })} className={input}>{(filters.data?.graduationYears ?? []).map((year) => <option key={year} value={year}>Class of {year}</option>)}</select></label></div></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Readiness governance</p><h2 className="font-headline text-xl font-black mt-1">Evidence weights and taxonomy</h2></div><fieldset><legend className="text-xs font-bold mb-2">Weights must total 100</legend><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{COMPONENTS.map((key) => <label key={key} className="text-xs font-bold capitalize">{key}<input type="number" min="0" max="100" value={form.readinessWeights[key]} onChange={(event) => setForm({ ...form, readinessWeights: { ...form.readinessWeights, [key]: event.target.value } })} className={input} /></label>)}</div><p className={`text-xs mt-2 font-bold ${COMPONENTS.reduce((sum, key) => sum + Number(form.readinessWeights[key] || 0), 0) === 100 ? 'text-green-700' : 'text-error'}`}>Total: {COMPONENTS.reduce((sum, key) => sum + Number(form.readinessWeights[key] || 0), 0)}</p></fieldset><label className="block text-xs font-bold">College skill taxonomy<textarea rows="4" value={form.skillTaxonomy} onChange={(event) => setForm({ ...form, skillTaxonomy: event.target.value })} placeholder="Java, Python, React, SQL" className={input} /></label></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Integrations</p><h2 className="font-headline text-xl font-black mt-1">Delivery and roster providers</h2></div><div className="grid sm:grid-cols-3 gap-4"><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={form.providers.email} onChange={(event) => setForm({ ...form, providers: { ...form.providers, email: event.target.checked } })} />Email enabled</label><label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={form.providers.whatsapp} onChange={(event) => setForm({ ...form, providers: { ...form.providers, whatsapp: event.target.checked } })} />WhatsApp enabled</label><label className="text-xs font-bold">Student information system<select value={form.providers.sis} onChange={(event) => setForm({ ...form, providers: { ...form.providers, sis: event.target.value } })} className={input}><option value="none">Not connected</option><option value="csv">CSV sync</option><option value="api">API managed</option></select></label></div></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">College policy</p><h2 className="font-headline text-xl font-black mt-1">Offer and participation rules</h2><p className="text-xs text-on-surface-variant mt-1">Zero disables a numeric rule. Active offer and package-improvement rules are enforced by the API.</p></div><div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><label className="text-xs font-bold">Maximum active offers<input type="number" min="0" max="20" value={form.placementPolicies.maximumActiveOffers} onChange={(event) => setForm({ ...form, placementPolicies: { ...form.placementPolicies, maximumActiveOffers: Number(event.target.value) } })} className={input} /></label><label className="text-xs font-bold">Dream package (₹)<input type="number" min="0" value={form.placementPolicies.dreamPackage} onChange={(event) => setForm({ ...form, placementPolicies: { ...form.placementPolicies, dreamPackage: Number(event.target.value) } })} className={input} /></label><label className="text-xs font-bold">Super-dream package (₹)<input type="number" min="0" value={form.placementPolicies.superDreamPackage} onChange={(event) => setForm({ ...form, placementPolicies: { ...form.placementPolicies, superDreamPackage: Number(event.target.value) } })} className={input} /></label><label className="text-xs font-bold">Minimum package improvement %<input type="number" min="0" max="500" value={form.placementPolicies.minimumPackageImprovementPct} onChange={(event) => setForm({ ...form, placementPolicies: { ...form.placementPolicies, minimumPackageImprovementPct: Number(event.target.value) } })} className={input} /></label><label className="text-xs font-bold">Debar after no-shows<input type="number" min="0" max="20" value={form.placementPolicies.debarAfterNoShows} onChange={(event) => setForm({ ...form, placementPolicies: { ...form.placementPolicies, debarAfterNoShows: Number(event.target.value) } })} className={input} /></label></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.placementPolicies.allowWithdrawal} onChange={(event) => setForm({ ...form, placementPolicies: { ...form.placementPolicies, allowWithdrawal: event.target.checked } })} />Students may withdraw after applying</label></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Roster operations</p><h2 className="font-headline text-xl font-black mt-1">CSV / SIS synchronization</h2><p className="text-xs text-on-surface-variant mt-1">Rows are mapped by email, external IDs remain unique, invalid records are rejected, and unmatched accounts are reported without partial guessing.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportRoster} className="px-4 py-2.5 rounded-xl bg-surface-container text-xs font-black">Export mapping template</button><label className={`px-4 py-2.5 rounded-xl text-xs font-black ${form.providers.sis === 'none' ? 'bg-surface-container text-outline cursor-not-allowed' : 'bg-primary text-on-primary cursor-pointer'}`}>Import validated CSV<input type="file" accept=".csv,text/csv" disabled={form.providers.sis === 'none'} onChange={importRoster} className="sr-only" /></label></div></section>

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Roles and permissions</p><h2 className="font-headline text-xl font-black mt-1">Placement-office access</h2><p className="text-xs text-on-surface-variant mt-1">Viewers are technically prevented from changing records. Only the placement head can change staff roles.</p></div><div className="divide-y divide-outline-variant/60">{(staff.data?.staff ?? []).map((person) => <div key={person._id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{person.name}</p><p className="text-xs text-on-surface-variant">{person.email}</p></div><select value={person.staffRole || 'placement-head'} onChange={(event) => changeRole(person._id, event.target.value)} className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-xs font-bold"><option value="placement-head">Placement head</option><option value="officer">Placement officer</option><option value="faculty-coordinator">Faculty coordinator</option><option value="viewer">Viewer</option></select></div>)}</div></section>

    <div className="flex justify-end"><button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-black disabled:opacity-50">{saving ? 'Saving…' : 'Save placement settings'}</button></div>
  </form>;
}
