import React, { useState } from 'react';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import InterventionQueue from './InterventionQueue.jsx';
import AdminTasks from './AdminTasks.jsx';
import ReviewQueue from './ReviewQueue.jsx';
import MentoringQueue from './MentoringQueue.jsx';

const TABS = [
  ['interventions', 'Interventions', 'support_agent'],
  ['tasks', 'Assigned actions', 'task_alt'],
  ['reviews', 'Reviews', 'rate_review'],
  ['mentoring', 'Mentoring', 'diversity_3'],
];

export default function ActionCentre() {
  const [tab, setTab] = useState('interventions');
  const { graduationYear } = useAdminScope();
  return <div className="space-y-4">
    <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-2 flex gap-1 overflow-x-auto" role="tablist" aria-label="Action Centre views">
      {TABS.map(([key, label, icon]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${tab === key ? 'bg-inverse-surface text-white' : 'text-on-surface-variant hover:bg-surface-container'}`}><span className="material-symbols-outlined text-base">{icon}</span>{label}</button>)}
    </div>
    {tab === 'interventions' && <InterventionQueue />}
    {tab === 'tasks' && <AdminTasks />}
    {tab === 'reviews' && <ReviewQueue graduationYear={graduationYear} />}
    {tab === 'mentoring' && <MentoringQueue />}
  </div>;
}
