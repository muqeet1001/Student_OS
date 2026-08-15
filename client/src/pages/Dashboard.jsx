import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import JobsForYou from '../features/dashboard/JobsForYou.jsx';
import NotificationList from '../features/dashboard/NotificationList.jsx';
import ReadinessCard from '../features/dashboard/ReadinessCard.jsx';
import TargetRole from '../features/dashboard/TargetRole.jsx';
import TodayPlan from '../features/dashboard/TodayPlan.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Section({ title, action, children }) {
  return <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5"><div className="flex items-center justify-between gap-3 mb-3"><h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">{title}</h2>{action}</div>{children}</section>;
}

/** A decision screen: current position, next work and urgent opportunities. */
export default function Dashboard() {
  const { data, loading, error, refetch } = useApiResource('/dashboard');
  const [roleOverride, setRoleOverride] = useState(undefined);
  if (loading && !data) return <LoadingBlock label="Loading your dashboard" className="min-h-dvh" />;
  if (error && !data) return <div className="p-6 pt-16 lg:pt-6"><ErrorBlock error={error} onRetry={refetch} /></div>;

  const targetRole = roleOverride === undefined ? data.targetRole : roleOverride;
  const firstName = (data.student?.name ?? 'there').split(' ')[0];
  const weakest = data.readiness.components.find((item) => item.key === data.readiness.weakest);
  const priorities = data.recommendations.slice(0, 3);

  return <div className="bg-background text-on-surface min-h-dvh"><div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4"><header className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight">{greeting()}, {firstName}</h1><p className="text-sm text-on-surface-variant mt-1">{data.readiness.score >= 80 ? 'You are ready to focus on applications.' : `${weakest?.label ?? 'Your preparation'} is the best place to improve next.`}</p></div><Link to="/my-plan" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold">Open my plan <span className="material-symbols-outlined text-base">arrow_forward</span></Link></header><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><ReadinessCard readiness={data.readiness} /><TodayPlan plan={data.plan} /><TargetRole targetRole={targetRole} availableRoles={data.availableRoles} onChange={setRoleOverride} /></div><Section title="Three priorities" action={<Link to="/my-plan" className="text-xs font-bold text-primary hover:underline">See complete plan</Link>}>{priorities.length === 0 ? <p className="text-sm text-on-surface-variant">No preparation blockers remain. Focus on eligible opportunities.</p> : <ol className="grid grid-cols-1 md:grid-cols-3 gap-2">{priorities.map((item, index) => <li key={item.id}><Link to={item.action.to} className="h-full flex gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container"><span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-black shrink-0">{index + 1}</span><div><p className="text-sm font-bold leading-snug">{item.text}</p><span className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-2">{item.action.label}<span className="material-symbols-outlined text-sm">chevron_right</span></span></div></Link></li>)}</ol>}</Section><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Section title="Eligible opportunities" action={<Link to="/opportunities" className="text-xs font-bold text-primary hover:underline">Eligibility centre</Link>}><JobsForYou /></Section><Section title="Needs your attention" action={<Link to="/updates" className="text-xs font-bold text-primary hover:underline">All updates</Link>}><NotificationList notifications={data.notifications.slice(0, 3)} /></Section></div></div></div>;
}
