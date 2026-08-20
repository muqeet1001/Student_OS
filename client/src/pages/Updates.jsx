import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const TABS = [
  ['all', 'All'], ['action', 'Tasks'], ['application', 'Applications'],
  ['calendar', 'Calendar'], ['document', 'Documents'], ['messages', 'Messages'],
];

function formatWhen(value) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function Updates() {
  const center = useApiResource('/journey/action-center');
  const inbox = useApiResource('/announcements/me');
  const [tab, setTab] = useState('all');
  const [busy, setBusy] = useState('');
  const messages = inbox.data?.announcements ?? [];
  const visible = useMemo(
    () => {
      const entries = center.data?.entries ?? [];
      return tab === 'all' ? entries : entries.filter((entry) => entry.source === tab || entry.category === tab);
    },
    [center.data?.entries, tab],
  );

  if (center.loading && !center.data) return <LoadingBlock label="Loading your action centre" className="min-h-dvh" />;
  if (center.error && !center.data) return <div className="p-6 pt-16 lg:pt-6"><ErrorBlock error={center.error} onRetry={center.refetch} /></div>;

  async function addReminder() {
    const title = window.prompt('What do you need to remember?');
    if (!title?.trim()) return;
    const dueAt = window.prompt('When is it due? Use YYYY-MM-DD or leave blank.', '');
    try {
      await api.post('/journey/actions', { title: title.trim(), category: 'other', dueAt: dueAt || null, link: '/updates' });
      await center.refetch({ quiet: true });
    } catch (error) { window.alert(error.message || 'Could not add reminder.'); }
  }

  async function complete(entry) {
    if (!entry.action?._id) return;
    setBusy(entry.action._id);
    try { await api.patch(`/journey/actions/${entry.action._id}`, { status: 'done' }); await center.refetch({ quiet: true }); }
    catch (error) { window.alert(error.message || 'Could not complete that task.'); }
    finally { setBusy(''); }
  }

  async function exportCalendar() {
    try {
      const response = await api.raw('/journey/calendar.ics');
      const url = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = 'student-os-calendar.ics'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) { window.alert(error.message || 'Could not export calendar.'); }
  }

  return <div className="bg-background text-on-surface min-h-dvh"><div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">One action centre</p><h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">Updates and deadlines</h1><p className="text-sm text-on-surface-variant mt-1">Tasks, application follow-ups, events, expiring documents and messages—ordered by time.</p></div><div className="flex gap-2"><button type="button" onClick={addReminder} className="px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold">Add reminder</button><button type="button" onClick={exportCalendar} className="px-4 py-2.5 rounded-full bg-surface-container text-sm font-bold">Export calendar</button></div></header>
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Update categories">{TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${tab === key ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface-variant'}`}>{label}{key === 'messages' && inbox.data?.unread ? ` (${inbox.data.unread})` : ''}</button>)}</nav>
    {tab === 'messages' ? <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest divide-y divide-outline-variant/60">{messages.map((message) => <article key={message._id} className="p-4"><p className="font-bold text-sm">{message.subject}</p><p className="text-xs text-on-surface-variant mt-1">{message.from} · {new Date(message.sentAt).toLocaleDateString('en-IN')}</p><p className="text-sm mt-2 line-clamp-2">{message.body}</p></article>)}{messages.length === 0 && <p className="p-5 text-sm text-on-surface-variant">No placement-office messages yet.</p>}<Link to="/inbox" className="block p-4 text-sm font-bold text-primary">Open complete inbox</Link></section> : <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest divide-y divide-outline-variant/60">{visible.map((entry) => <article key={entry.id} className="p-4 flex items-start gap-3"><span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined">{entry.source === 'calendar' ? 'event' : entry.source === 'application' ? 'work' : entry.source === 'document' ? 'folder' : 'task_alt'}</span></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><Link to={entry.link || '/updates'} className="font-bold text-sm hover:text-primary">{entry.title}</Link><span className="text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-surface-container">{entry.category}</span></div><p className="text-xs text-on-surface-variant mt-1">{entry.detail || 'Needs your attention'}</p><p className="text-[11px] font-bold text-primary mt-1">{formatWhen(entry.at)}</p></div>{entry.action && <button type="button" disabled={busy === entry.action._id} onClick={() => complete(entry)} className="px-3 py-1.5 rounded-full bg-surface-container text-xs font-bold disabled:opacity-50">Done</button>}</article>)}{visible.length === 0 && <p className="p-6 text-sm text-on-surface-variant text-center">Nothing in this category needs attention.</p>}</section>}
  </div></div>;
}
