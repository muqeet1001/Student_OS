import React, { useState } from 'react';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

export default function MentoringQueue() {
  const { graduationYear } = useAdminScope();
  const resource = useApiResource(`/journey/staff?graduationYear=${graduationYear}`);
  const [busy, setBusy] = useState('');
  const appointments = resource.data?.appointments ?? [];

  async function update(item, status) {
    let startsAt = item.startsAt;
    if (status === 'scheduled' && !startsAt) {
      startsAt = window.prompt('Meeting date and time (for example 2026-09-01 15:30)', '');
      if (!startsAt) return;
    }
    setBusy(item._id);
    try {
      await api.patch(`/journey/mentoring/${item._id}`, { status, startsAt: startsAt || null });
      await resource.refetch({ quiet: true });
    } catch (error) { window.alert(error.message || 'Could not update the mentoring request.'); }
    finally { setBusy(''); }
  }

  return <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden"><header className="p-5 border-b border-outline-variant/60"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Mentoring</p><h2 className="font-headline text-xl font-black mt-1">Requests and appointments</h2></header>{appointments.length === 0 ? <p className="p-8 text-sm text-on-surface-variant text-center">No mentoring requests for this graduating batch.</p> : <div className="divide-y divide-outline-variant/60">{appointments.map((item) => <article key={item._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-bold">{item.student?.name} · {item.topic}</p><span className="px-2 py-0.5 rounded-full bg-surface-container text-[9px] uppercase font-black">{item.status}</span></div><p className="text-xs text-on-surface-variant mt-1">{item.note || 'No note'}{item.startsAt ? ` · ${new Date(item.startsAt).toLocaleString('en-IN')}` : ''}</p></div><div className="flex gap-2">{item.status === 'requested' && <button type="button" disabled={busy === item._id} onClick={() => update(item, 'scheduled')} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-black">Schedule</button>}{item.status === 'scheduled' && <button type="button" disabled={busy === item._id} onClick={() => update(item, 'completed')} className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-black">Complete</button>}</div></article>)}</div>}</section>;
}
