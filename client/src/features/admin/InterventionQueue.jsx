import React, { useMemo, useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import StudentDetail from './StudentDetail.jsx';
import { api } from '../../lib/api.js';

const signalsFor = (student) => {
  const items = [];
  if (student.applications === 0) items.push({ key: 'no-applications', label: 'No applications', action: 'Review eligibility and agree on one application.', severity: 'high' });
  if (student.components.resume < 60) items.push({ key: 'resume', label: 'Resume evidence incomplete', action: 'Complete profile evidence and resume information.', severity: 'high' });
  if (student.testsTaken >= 2 && student.testsPassed === 0) items.push({ key: 'assessments', label: 'Assessment difficulty', action: 'Assign focused practice or a training session.', severity: 'urgent' });
  if (student.interviewsCompleted === 0 && student.readiness >= 45) items.push({ key: 'interview', label: 'No interview practice', action: 'Schedule a first mock interview.', severity: 'medium' });
  if (student.verifiedSkills === 0 && student.skillCount > 0) items.push({ key: 'verification', label: 'Skills not verified', action: 'Assign the matching skill assessment.', severity: 'medium' });
  return items;
};

const rank = { urgent: 4, high: 3, medium: 2, low: 1 };

export default function InterventionQueue() {
  const { graduationYear } = useAdminScope();
  const studentsResource = useApiResource(`/admin/students?graduationYear=${graduationYear}&sort=readiness-asc&limit=100`);
  const taskResource = useApiResource(`/journey/staff?graduationYear=${graduationYear}`);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [form, setForm] = useState({ signalKey: '', dueAt: '', priority: 'high' });
  const [busy, setBusy] = useState(false);

  const assigned = useMemo(() => new Set((taskResource.data?.actions ?? []).filter((item) => item.status === 'todo').map((item) => `${item.owner?._id || item.owner}:${item.signalKey}`)), [taskResource.data?.actions]);
  const cases = useMemo(() => (studentsResource.data?.students ?? []).map((student) => ({ student, signals: signalsFor(student) })).filter((item) => item.signals.length).map((item) => ({ ...item, priority: item.signals.reduce((top, signal) => rank[signal.severity] > rank[top] ? signal.severity : top, 'low') })).sort((a, b) => rank[b.priority] - rank[a.priority] || b.signals.length - a.signals.length || a.student.readiness - b.student.readiness), [studentsResource.data?.students]);
  const visible = filter === 'all' ? cases : cases.filter((item) => item.signals.some((signal) => signal.key === filter));

  if ((studentsResource.loading && !studentsResource.data) || (taskResource.loading && !taskResource.data)) return <LoadingBlock label="Prioritising student support" />;
  if (studentsResource.error) return <ErrorBlock error={studentsResource.error} onRetry={studentsResource.refetch} />;

  function openAssign(item) {
    const signal = item.signals.find((candidate) => !assigned.has(`${item.student._id}:${candidate.key}`)) || item.signals[0];
    const due = new Date(Date.now() + (signal.severity === 'urgent' ? 2 : 7) * 86_400_000).toISOString().slice(0, 10);
    setAssigning(item);
    setForm({ signalKey: signal.key, dueAt: due, priority: signal.severity });
  }

  async function assign(event) {
    event.preventDefault();
    const signal = assigning.signals.find((item) => item.key === form.signalKey);
    setBusy(true);
    try {
      await api.post('/journey/actions', { owner: assigning.student._id, category: 'preparation', title: signal.action, description: signal.label, dueAt: form.dueAt || null, priority: form.priority, signalKey: signal.key, link: '/my-plan', reminderChannels: ['in-app', 'email', 'whatsapp'] });
      setAssigning(null);
      await taskResource.refetch({ quiet: true });
    } catch (error) { window.alert(error.message || 'Could not assign that action.'); }
    finally { setBusy(false); }
  }

  const signalFilters = [...new Map(cases.flatMap((item) => item.signals).map((signal) => [signal.key, signal.label])).entries()];

  return <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[[cases.length, 'Student cases'], [cases.filter((item) => ['urgent', 'high'].includes(item.priority)).length, 'High priority'], [cases.filter((item) => item.signals.some((signal) => signal.key === 'no-applications')).length, 'No applications'], [(taskResource.data?.actions ?? []).filter((item) => item.status === 'todo').length, 'Actions assigned']].map(([value, label]) => <div key={label} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{value}</p><p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">{label}</p></div>)}
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap ${filter === 'all' ? 'bg-inverse-surface text-white' : 'bg-surface-container'}`}>All cases</button>{signalFilters.map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap ${filter === key ? 'bg-inverse-surface text-white' : 'bg-surface-container'}`}>{label}</button>)}</div>
    {!visible.length ? <EmptyBlock icon="task_alt" title="No intervention needed" description="No active-batch students match this view." /> : <div className="grid lg:grid-cols-2 gap-3">{visible.map((item) => <article key={item.student._id} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3"><button type="button" onClick={() => setSelected(item.student)} className="text-left min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-headline font-black">{item.student.name}</h3><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.priority === 'urgent' ? 'bg-error-container text-on-error-container' : item.priority === 'high' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{item.priority}</span></div><p className="text-xs text-on-surface-variant mt-1">{item.student.branch || 'Branch not set'} · {item.student.readiness}% ready · {item.student.applications} applications</p></button><button type="button" onClick={() => openAssign(item)} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-black">Assign action</button></div>
      <ul className="mt-3 space-y-1.5">{item.signals.map((signal) => { const isAssigned = assigned.has(`${item.student._id}:${signal.key}`); return <li key={signal.key} className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2"><span className={`w-2 h-2 rounded-full ${signal.severity === 'urgent' ? 'bg-error' : signal.severity === 'high' ? 'bg-primary' : 'bg-outline'}`} /><span className="text-xs font-bold flex-1">{signal.label}</span>{isAssigned && <span className="text-[9px] uppercase font-black text-green-700">Assigned</span>}</li>; })}</ul>
    </article>)}</div>}
    {assigning && <div className="fixed inset-0 z-[70] bg-neutral-950/45 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAssigning(null)}><form onSubmit={assign} className="w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 shadow-2xl space-y-4"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Assign student action</p><h2 className="font-headline text-xl font-black mt-1">{assigning.student.name}</h2></div><label className="block text-xs font-bold">Blocker<select value={form.signalKey} onChange={(event) => setForm({ ...form, signalKey: event.target.value })} className="mt-1 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm">{assigning.signals.map((signal) => <option key={signal.key} value={signal.key}>{signal.label}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Due date<input type="date" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} className="mt-1 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm"><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div><div className="flex gap-2 justify-end"><button type="button" onClick={() => setAssigning(null)} className="px-4 py-2 rounded-lg text-sm font-bold">Cancel</button><button type="submit" disabled={busy} className="px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-black disabled:opacity-50">{busy ? 'Assigning…' : 'Assign and notify'}</button></div></form></div>}
    {selected && <StudentDetail student={selected} onClose={() => setSelected(null)} />}
  </div>;
}
