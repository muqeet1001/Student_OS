import React from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { api } from '../../lib/api.js';
import { useApiResource } from '../../hooks/useApiResource.js';

const LABELS = { profile: 'Career profile', resume: 'Resume', interview: 'Interview answer', project: 'Project description' };

export default function ReviewQueue() {
  const { data, loading, error, refetch } = useApiResource('/reviews/queue');
  async function review(item) {
    const feedback = window.prompt(`Actionable feedback for ${item.student?.name}`, 'The strongest part is… The one change I recommend is…');
    if (!feedback?.trim()) return;
    try { await api.patch(`/reviews/${item._id}`, { feedback: feedback.trim() }); await refetch({ quiet: true }); }
    catch (caught) { window.alert(caught.message || 'Could not save feedback.'); }
  }
  if (loading && !data) return <LoadingBlock label="Loading review requests" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;
  const pending = (data?.reviews ?? []).filter((item) => item.status === 'requested');
  const completed = (data?.reviews ?? []).filter((item) => item.status === 'reviewed');
  return <section className="space-y-4">{pending.length === 0 ? <EmptyBlock icon="forum" title="No reviews waiting" description="Student requests for human feedback will appear here." /> : <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest divide-y divide-outline-variant/60">{pending.map((item) => <div key={item._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex gap-2 items-center flex-wrap"><h3 className="font-bold">{item.student?.name}</h3><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">{LABELS[item.kind]}</span></div><p className="text-sm text-on-surface-variant mt-1">{item.note || 'No special focus requested.'}</p><p className="text-[10px] text-outline mt-1">Requested {new Date(item.createdAt).toLocaleDateString('en-IN')}</p></div><button type="button" onClick={() => review(item)} className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold shrink-0">Write feedback</button></div>)}</div>}{completed.length > 0 && <details className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"><summary className="font-bold cursor-pointer">Recently completed ({completed.length})</summary><ul className="mt-3 space-y-2">{completed.slice(0, 10).map((item) => <li key={item._id} className="text-sm text-on-surface-variant">{item.student?.name} · {LABELS[item.kind]} · {item.reviewer?.name ?? 'staff'}</li>)}</ul></details>}</section>;
}
