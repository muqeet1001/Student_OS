import React, { useState } from 'react';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import Placements from './Placements.jsx';
import PlacementInsight from './PlacementInsight.jsx';
import Insights from './Insights.jsx';
import Alumni from './Alumni.jsx';

const TABS = [
  ['season', 'Season performance'],
  ['skills', 'Skills and readiness'],
  ['history', 'Historical trends'],
];

export default function ReportsWorkspace() {
  const [tab, setTab] = useState('season');
  const { graduationYear } = useAdminScope();
  return <div className="space-y-5">
    <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Reports and analytics views">{TABS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-black ${tab === key ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface-variant'}`}>{label}</button>)}</div>
    {tab === 'season' && <div className="space-y-7"><Placements graduationYear={graduationYear} /><PlacementInsight graduationYear={graduationYear} /></div>}
    {tab === 'skills' && <Insights graduationYear={graduationYear} />}
    {tab === 'history' && <Alumni />}
  </div>;
}
