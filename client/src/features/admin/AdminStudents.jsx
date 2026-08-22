import React, { useMemo, useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import { api } from '../../lib/api.js';
import StudentDetail from './StudentDetail.jsx';

const BAND = { ready: 'bg-green-100 text-green-800', progressing: 'bg-secondary-container text-on-secondary-container', 'at-risk': 'bg-error-container/25 text-on-error-container' };
const EMPTY_FILTERS = { search: '', branch: '', band: '', sort: 'readiness', minCgpa: '', minReadiness: '', minCoding: '', minAts: '', minInterview: '', minVerifiedSkills: '', skill: '', hasProjects: false, hasCertifications: false };

function NumberFilter({ label, value, max = 100, step = 1, onChange }) {
  return <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">{label}</span><input type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Any" className="w-full rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm" /></label>;
}

export default function AdminStudents() {
  const { graduationYear, branches, bands } = useAdminScope();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saveName, setSaveName] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const query = useMemo(() => {
    const params = new URLSearchParams({ graduationYear: String(graduationYear), page: String(page), limit: '25', sort: filters.sort });
    Object.entries({ ...filters, search: debouncedSearch }).forEach(([key, value]) => { if (value !== '' && value !== false) params.set(key, String(value)); });
    return params.toString();
  }, [debouncedSearch, filters, graduationYear, page]);

  const resource = useApiResource(`/admin/students?${query}`);
  const saved = useApiResource('/admin/students/views');
  const update = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); setSelectedIds(new Set()); };

  if (resource.loading && !resource.data) return <LoadingBlock label="Loading active cohort" />;
  if (resource.error) return <ErrorBlock error={resource.error} onRetry={resource.refetch} />;

  const students = resource.data?.students ?? [];
  const summary = resource.data?.summary;
  const pagination = resource.data?.pagination;
  const allPageSelected = students.length > 0 && students.every((student) => selectedIds.has(student._id));
  const toggle = (id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const togglePage = () => setSelectedIds((current) => { const next = new Set(current); if (allPageSelected) students.forEach((student) => next.delete(student._id)); else students.forEach((student) => next.add(student._id)); return next; });

  async function saveView(kind) {
    if (!saveName.trim()) return;
    setBusy(true);
    try {
      await api.post('/admin/students/views', { name: saveName.trim(), kind, filters, students: kind === 'candidate-list' ? [...selectedIds] : [] });
      setSaveName('');
      await saved.refetch({ quiet: true });
    } finally { setBusy(false); }
  }

  function applyView(view) {
    setFilters({ ...EMPTY_FILTERS, ...(view.filters ?? {}) });
    setSelectedIds(new Set(view.students ?? []));
    setAdvanced(true);
    setPage(1);
  }

  async function assignBulk(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api.post('/journey/actions/bulk', { owners: [...selectedIds], title: form.get('title'), description: form.get('description'), priority: form.get('priority'), category: form.get('category'), dueAt: form.get('dueAt') || null, reminderChannels: ['in-app'] });
      setBulkOpen(false);
      setSelectedIds(new Set());
    } finally { setBusy(false); }
  }

  return <div className="space-y-4">
    {summary && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[[summary.total, 'Students in view'], [`${summary.averageReadiness}%`, 'Average readiness'], [summary.bands.find((item) => item.key === 'ready')?.count ?? 0, 'Placement ready'], [summary.bands.find((item) => item.key === 'at-risk')?.count ?? 0, 'At risk']].map(([value, label]) => <div key={label} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{value}</p><p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">{label}</p></div>)}</div>}

    {summary?.dataQuality && <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex flex-col md:flex-row md:items-center gap-3"><div className="md:w-56"><p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Data quality</p><p className="text-sm font-bold mt-1">Records requiring verification</p></div><div className="flex flex-wrap gap-2">{Object.entries({ 'Missing CGPA': summary.dataQuality.missingCgpa, 'Missing department': summary.dataQuality.missingBranch, 'No saved resume': summary.dataQuality.missingResume, 'Missing documents': summary.dataQuality.missingDocuments, 'Profile stale >180 days': summary.dataQuality.staleProfiles }).map(([label, value]) => <span key={label} className={`rounded-full px-3 py-1.5 text-xs font-bold ${value ? 'bg-white text-amber-900' : 'bg-green-100 text-green-800'}`}><strong>{value}</strong> {label}</span>)}</div></div></section>}

    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2.5 rounded-xl flex-1 min-w-[16rem]"><span className="material-symbols-outlined text-outline">search</span><input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Search name or email" type="search" className="bg-transparent outline-none text-sm w-full" /></div>
        <select value={filters.branch} onChange={(event) => update('branch', event.target.value)} className="rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm font-bold"><option value="">All departments</option>{branches.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={filters.band} onChange={(event) => update('band', event.target.value)} className="rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm font-bold"><option value="">All readiness</option>{bands.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <select value={filters.sort} onChange={(event) => update('sort', event.target.value)} className="rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm font-bold"><option value="readiness">Most ready</option><option value="readiness-asc">Least ready</option><option value="solved">Most solved</option><option value="name">Name</option></select>
        <button type="button" onClick={() => setAdvanced((value) => !value)} className="px-4 py-2.5 rounded-xl bg-surface-container text-xs font-black">{advanced ? 'Hide' : 'Smart filters'}</button>
        <a href={`/api/admin/students/export?${query}`} className="px-4 py-2.5 rounded-xl bg-surface-container text-xs font-black">Export CSV</a>
      </div>

      {advanced && <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 pt-3 border-t border-outline-variant/60">
        <NumberFilter label="Minimum CGPA" max={10} step="0.1" value={filters.minCgpa} onChange={(value) => update('minCgpa', value)} />
        <NumberFilter label="Readiness" value={filters.minReadiness} onChange={(value) => update('minReadiness', value)} />
        <NumberFilter label="Coding score" value={filters.minCoding} onChange={(value) => update('minCoding', value)} />
        <NumberFilter label="ATS score" value={filters.minAts} onChange={(value) => update('minAts', value)} />
        <NumberFilter label="Interview score" value={filters.minInterview} onChange={(value) => update('minInterview', value)} />
        <NumberFilter label="Verified skills" value={filters.minVerifiedSkills} onChange={(value) => update('minVerifiedSkills', value)} />
        <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Verified skill</span><input value={filters.skill} onChange={(event) => update('skill', event.target.value)} placeholder="Java, React…" className="w-full rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm" /></label>
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={filters.hasProjects} onChange={(event) => update('hasProjects', event.target.checked)} /> Has projects</label>
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={filters.hasCertifications} onChange={(event) => update('hasCertifications', event.target.checked)} /> Has certifications</label>
        <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs font-black text-primary text-left">Clear filters</button>
      </div>}

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-outline-variant/60">
        <select defaultValue="" onChange={(event) => { const view = saved.data?.views?.find((item) => item._id === event.target.value); if (view) applyView(view); }} className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-xs font-bold"><option value="">Open saved view or candidate list</option>{(saved.data?.views ?? []).map((view) => <option key={view._id} value={view._id}>{view.name} · {view.kind === 'candidate-list' ? `${view.students.length} students` : 'live filter'}</option>)}</select>
        <input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Name this view" maxLength={80} className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-xs" />
        <button type="button" disabled={busy || saveName.trim().length < 2} onClick={() => saveView('filter')} className="rounded-lg bg-surface-container px-3 py-2 text-xs font-black disabled:opacity-40">Save filter</button>
        <button type="button" disabled={busy || saveName.trim().length < 2 || selectedIds.size === 0} onClick={() => saveView('candidate-list')} className="rounded-lg bg-surface-container px-3 py-2 text-xs font-black disabled:opacity-40">Save selected list</button>
      </div>
    </section>

    {selectedIds.size > 0 && <section className="sticky top-3 z-10 rounded-xl bg-inverse-surface p-3 text-white shadow-xl"><div className="flex flex-wrap items-center gap-3"><p className="text-sm font-black">{selectedIds.size} students selected</p>{selectedIds.size >= 2 && selectedIds.size <= 4 && <button type="button" onClick={() => setCompareOpen(true)} className="ml-auto rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-xs font-black">Compare candidates</button>}<button type="button" onClick={() => setBulkOpen((value) => !value)} className={`${selectedIds.size < 2 || selectedIds.size > 4 ? 'ml-auto' : ''} rounded-lg bg-white px-4 py-2 text-xs font-black text-inverse-surface`}>Assign action</button><button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-white/70">Clear</button></div>{bulkOpen && <form onSubmit={assignBulk} className="grid md:grid-cols-[1fr_1fr_9rem_9rem_10rem_auto] gap-2 mt-3"><input name="title" required minLength={2} placeholder="Action title" className="rounded-lg bg-white/10 px-3 py-2 text-sm placeholder:text-white/50" /><input name="description" placeholder="Instructions" className="rounded-lg bg-white/10 px-3 py-2 text-sm placeholder:text-white/50" /><select name="category" className="rounded-lg bg-inverse-surface border border-white/20 px-2 py-2 text-xs"><option value="application">Application</option><option value="preparation">Preparation</option><option value="document">Document</option><option value="meeting">Meeting</option><option value="other">Other</option></select><select name="priority" className="rounded-lg bg-inverse-surface border border-white/20 px-2 py-2 text-xs"><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select><input name="dueAt" type="date" className="rounded-lg bg-white/10 px-2 py-2 text-xs" /><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-black">Assign</button></form>}</section>}

    {compareOpen && <div className="fixed inset-0 z-50 bg-black/45 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Candidate comparison"><div className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-surface p-5 shadow-2xl"><div className="flex justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-primary">Evidence comparison</p><h2 className="font-headline text-xl font-black">Candidates side by side</h2></div><button type="button" onClick={() => setCompareOpen(false)} aria-label="Close comparison" className="w-9 h-9 rounded-full bg-surface-container"><span className="material-symbols-outlined">close</span></button></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">{students.filter((student) => selectedIds.has(student._id)).map((student) => <article key={student._id} className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"><h3 className="font-bold">{student.name}</h3><p className="text-xs text-on-surface-variant">{student.branch || 'Department missing'} · CGPA {student.cgpa ?? 'missing'}</p><dl className="mt-4 space-y-2 text-xs">{[['Readiness', `${student.readiness}%`], ['Coding', `${student.components.coding}%`], ['ATS / resume', `${student.components.resume}%`], ['Interview', `${student.interviewAverage}%`], ['Verified skills', student.verifiedSkills], ['Projects', student.projectCount], ['Applications', student.applications]].map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-outline-variant/40 pb-2"><dt className="text-on-surface-variant">{label}</dt><dd className="font-black">{value}</dd></div>)}</dl><button type="button" onClick={() => { setCompareOpen(false); setSelectedStudent(student._id); }} className="mt-4 text-xs font-black text-primary">Open complete record</button></article>)}</div></div></div>}

    {!students.length ? <EmptyBlock icon="group_off" title="No students match" description="Widen the filters or open another saved view." /> : <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left min-w-[72rem]"><thead><tr className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant"><th className="px-4 py-3"><input type="checkbox" checked={allPageSelected} onChange={togglePage} aria-label="Select this page" /></th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Department / CGPA</th><th className="px-4 py-3">Readiness</th><th className="px-4 py-3">ATS</th><th className="px-4 py-3">Coding</th><th className="px-4 py-3">Tests</th><th className="px-4 py-3">Interviews</th><th className="px-4 py-3">Evidence</th></tr></thead><tbody>{students.map((student) => <tr key={student._id} onClick={() => setSelectedStudent(student)} className="border-t border-outline-variant/60 hover:bg-surface-container-low/60 cursor-pointer"><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.has(student._id)} onChange={() => toggle(student._id)} aria-label={`Select ${student.name}`} /></td><td className="px-4 py-3"><p className="text-sm font-bold">{student.name}</p><p className="text-xs text-on-surface-variant truncate max-w-[15rem]">{student.email}</p></td><td className="px-4 py-3 text-xs"><p>{student.branch || 'Not set'}</p><p className="text-on-surface-variant">CGPA {student.cgpa ?? 'unknown'}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-xs font-black tabular-nums">{student.readiness}%</span><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${BAND[student.band]}`}>{student.band}</span></div></td><td className="px-4 py-3 text-sm font-bold">{student.components.resume}%</td><td className="px-4 py-3 text-sm font-bold">{student.components.coding}%</td><td className="px-4 py-3 text-xs"><strong>{student.testsPassed}</strong>/{student.testsTaken}{student.testsTaken ? ` · ${student.testAverage}%` : ''}</td><td className="px-4 py-3 text-xs">{student.interviewsCompleted ? `${student.interviewsCompleted} · ${student.interviewAverage}%` : '—'}</td><td className="px-4 py-3 text-xs"><strong>{student.verifiedSkills}</strong> verified · {student.projectCount} projects · {student.certificationCount} certs</td></tr>)}</tbody></table></div>{pagination?.pages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/60"><p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.pages} · {pagination.total} students</p><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => setPage((value) => value - 1)} className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => setPage((value) => value + 1)} className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">Next</button></div></div>}</div>}
    {selectedStudent && <StudentDetail student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
  </div>;
}
