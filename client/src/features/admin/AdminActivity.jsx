import React, { useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';

const ICONS = {
  drive: 'business_center',
  company: 'domain',
  offer: 'workspace_premium',
  'student-action': 'task_alt',
};

export default function AdminActivity() {
  const [entityType, setEntityType] = useState('');
  const suffix = entityType ? `?entityType=${entityType}` : '';
  const resource = useApiResource(`/admin/activity${suffix}`);
  if (resource.loading && !resource.data) return <LoadingBlock label="Loading placement activity" />;
  if (resource.error) return <ErrorBlock error={resource.error} onRetry={resource.refetch} />;
  const events = resource.data?.events ?? [];

  return <div className="space-y-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-on-surface-variant">A permanent history of operational changes made by placement staff.</p><select value={entityType} onChange={(event) => setEntityType(event.target.value)} className="rounded-xl border border-outline-variant bg-transparent px-3 py-2.5 text-sm font-bold"><option value="">All activity</option><option value="drive">Drives</option><option value="company">Companies</option><option value="student-action">Student actions</option><option value="offer">Offers</option></select></div>{events.length === 0 ? <EmptyBlock icon="history" title="No activity recorded yet" description="New CRM actions will appear here with the staff member and timestamp." /> : <ol className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest divide-y divide-outline-variant/60">{events.map((event) => <li key={event._id} className="p-4 flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant text-lg">{ICONS[event.entityType] || 'history'}</span></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{event.summary}</p><p className="text-xs text-on-surface-variant mt-0.5">{event.actor?.name || 'Placement office'} · {new Date(event.createdAt).toLocaleString('en-IN')}</p></div><span className="text-[9px] font-black uppercase tracking-wider text-outline">{event.entityType}</span></li>)}</ol>}</div>;
}
