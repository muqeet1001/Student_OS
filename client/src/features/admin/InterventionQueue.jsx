import React, { useMemo, useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import StudentDetail from './StudentDetail.jsx';

const interventionsFor = (student) => {
  const items = [];
  if (student.applications === 0) items.push({ key: 'no-applications', label: 'No applications', action: 'Review eligibility and agree on one application.' });
  if (student.components.profile < 60) items.push({ key: 'profile', label: 'Profile incomplete', action: 'Complete evidence and resume information.' });
  if (student.testsTaken >= 2 && student.testsPassed === 0) items.push({ key: 'assessments', label: 'Repeated assessment difficulty', action: 'Assign focused practice or a training session.' });
  if (student.interviewsCompleted === 0 && student.readiness >= 45) items.push({ key: 'interview', label: 'No interview practice', action: 'Schedule a first mock interview.' });
  if (student.verifiedSkills === 0 && student.skillCount > 0) items.push({ key: 'verification', label: 'Skills not verified', action: 'Assign the matching skill assessment.' });
  return items;
};

export default function InterventionQueue() {
  const { data, loading, error, refetch } = useApiResource('/admin/students?sort=readiness-asc&limit=100');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const rows = useMemo(() => (data?.students ?? []).flatMap((student) => interventionsFor(student).map((item) => ({ student, ...item }))), [data?.students]);
  const visible = filter === 'all' ? rows : rows.filter((row) => row.key === filter);
  if (loading && !data) return <LoadingBlock label="Finding students who need support" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;
  const filters = [...new Map(rows.map((row) => [row.key, row.label])).entries()];
  return <><section className="space-y-3"><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{new Set(rows.map((row) => row.student._id)).size}</p><p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Students needing action</p></div><div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{rows.filter((row) => row.key === 'no-applications').length}</p><p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">No applications</p></div><div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{rows.filter((row) => row.key === 'profile').length}</p><p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Profile gaps</p></div><div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{rows.filter((row) => row.key === 'assessments').length}</p><p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Assessment support</p></div></div><div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter === 'all' ? 'bg-inverse-surface text-white' : 'bg-surface-container'}`}>All actions</button>{filters.map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter === key ? 'bg-inverse-surface text-white' : 'bg-surface-container'}`}>{label}</button>)}</div>{visible.length === 0 ? <EmptyBlock icon="task_alt" title="No intervention needed" description="No students currently match this action." /> : <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest divide-y divide-outline-variant/60">{visible.map((row) => <button key={`${row.student._id}-${row.key}`} type="button" onClick={() => setSelected(row.student)} className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-surface-container-low"><div><div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-sm">{row.student.name}</h3><span className="px-2 py-0.5 rounded-full bg-error-container/15 text-on-error-container text-[10px] font-black uppercase tracking-wider">{row.label}</span></div><p className="text-xs text-on-surface-variant mt-1">{row.action}</p><p className="text-[10px] text-outline mt-1">{row.student.branch || 'Branch not set'} · {row.student.readiness}% ready · {row.student.applications} applications</p></div><span className="material-symbols-outlined text-outline">chevron_right</span></button>)}</div>}</section>{selected && <StudentDetail student={selected} onClose={() => setSelected(null)} />}</>;
}
