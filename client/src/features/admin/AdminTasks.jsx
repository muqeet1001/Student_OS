import React, { useMemo, useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import { api } from '../../lib/api.js';

const PRIORITY = {
  urgent: 'bg-error-container text-on-error-container',
  high: 'bg-secondary-container text-on-secondary-container',
  medium: 'bg-surface-container text-on-surface-variant',
  low: 'bg-surface-container-low text-outline',
};

export default function AdminTasks() {
  const { graduationYear } = useAdminScope();
  const resource = useApiResource(`/journey/staff?graduationYear=${graduationYear}`);
  const staffResource = useApiResource('/admin/staff');
  const [status, setStatus] = useState('todo');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const actions = useMemo(() => (resource.data?.actions ?? []).filter((item) => {
    const matchesStatus = status === 'all' || item.status === status;
    const haystack = `${item.title} ${item.description} ${item.owner?.name} ${item.staffOwner?.name}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  }), [resource.data?.actions, search, status]);

  if ((resource.loading && !resource.data) || (staffResource.loading && !staffResource.data)) return <LoadingBlock label="Loading placement tasks" />;
  if (resource.error) return <ErrorBlock error={resource.error} onRetry={resource.refetch} />;

  async function update(item, patch) {
    setBusy(item._id);
    try {
      await api.patch(`/journey/actions/${item._id}`, patch);
      await resource.refetch({ quiet: true });
    } catch (error) { window.alert(error.message || 'Could not update the task.'); }
    finally { setBusy(''); }
  }

  return <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        ['Open', (resource.data?.actions ?? []).filter((item) => item.status === 'todo').length],
        ['Overdue', (resource.data?.actions ?? []).filter((item) => item.status === 'todo' && item.dueAt && new Date(item.dueAt) < new Date()).length],
        ['Urgent', (resource.data?.actions ?? []).filter((item) => item.status === 'todo' && item.priority === 'urgent').length],
        ['Completed', (resource.data?.actions ?? []).filter((item) => item.status === 'done').length],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4"><p className="text-2xl font-black">{value}</p><p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">{label}</p></div>)}
    </div>

    <div className="flex flex-col md:flex-row gap-3 md:items-center">
      <div className="flex-1 flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5"><span className="material-symbols-outlined text-outline">search</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search student, owner or task" className="w-full bg-transparent outline-none text-sm" /></div>
      <div className="flex gap-2">{['todo', 'done', 'all'].map((key) => <button key={key} type="button" onClick={() => setStatus(key)} className={`px-4 py-2 rounded-full text-xs font-black capitalize ${status === key ? 'bg-inverse-surface text-white' : 'bg-surface-container'}`}>{key === 'todo' ? 'Open' : key}</button>)}</div>
    </div>

    {!actions.length ? <EmptyBlock icon="task_alt" title="No tasks in this view" description="Assigned student actions will appear here with their owner and due date." /> : <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left min-w-[54rem]"><thead><tr className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant"><th className="px-4 py-3">Task</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Staff owner</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th></tr></thead><tbody>
        {actions.map((item) => <tr key={item._id} className="border-t border-outline-variant/60 hover:bg-surface-container-low/50"><td className="px-4 py-3"><p className="text-sm font-bold">{item.title}</p><p className="text-xs text-on-surface-variant line-clamp-1">{item.description || 'No additional context'}</p></td><td className="px-4 py-3 text-sm">{item.owner?.name || 'Student'}</td><td className="px-4 py-3"><select value={item.staffOwner?._id || item.staffOwner || item.assignedBy?._id || ''} disabled={busy === item._id} onChange={(event) => update(item, { staffOwner: event.target.value || null })} className="max-w-[10rem] rounded-lg border border-outline-variant bg-transparent px-2 py-1 text-xs font-bold"><option value="">Unassigned</option>{(staffResource.data?.staff ?? []).map((staff) => <option key={staff._id} value={staff._id}>{staff.name}</option>)}</select></td><td className={`px-4 py-3 text-xs font-bold ${item.dueAt && item.status === 'todo' && new Date(item.dueAt) < new Date() ? 'text-error' : ''}`}>{item.dueAt ? new Date(item.dueAt).toLocaleDateString('en-IN') : 'No due date'}</td><td className="px-4 py-3"><select value={item.priority || 'medium'} disabled={busy === item._id} onChange={(event) => update(item, { priority: event.target.value })} className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase border-0 ${PRIORITY[item.priority || 'medium']}`}>{Object.keys(PRIORITY).map((key) => <option key={key} value={key}>{key}</option>)}</select></td><td className="px-4 py-3"><select value={item.status} disabled={busy === item._id} onChange={(event) => update(item, { status: event.target.value, resolution: event.target.value === 'done' ? 'Completed by placement office' : '' })} className="rounded-lg border border-outline-variant bg-transparent px-2 py-1 text-xs font-bold"><option value="todo">Open</option><option value="done">Done</option><option value="dismissed">Dismissed</option></select></td></tr>)}
      </tbody></table></div>
    </div>}
  </div>;
}
