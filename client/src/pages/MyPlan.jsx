import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import TodayPlan from '../features/dashboard/TodayPlan.jsx';
import ProgressChart from '../features/dashboard/ProgressChart.jsx';
import ReadinessCard from '../features/dashboard/ReadinessCard.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

export default function MyPlan() {
  const dashboard = useApiResource('/dashboard');
  const roadmap = useApiResource('/dashboard/roadmap');
  const achievements = useApiResource('/dashboard/achievements');

  if (dashboard.loading && !dashboard.data) return <LoadingBlock label="Building your plan" className="min-h-dvh" />;
  if (dashboard.error && !dashboard.data) {
    return <div className="p-6 pt-16 lg:pt-6"><ErrorBlock error={dashboard.error} onRetry={dashboard.refetch} /></div>;
  }

  const currentWeek = roadmap.data?.weeks?.find((week) => !week.complete);
  const earned = achievements.data?.badges?.filter((badge) => badge.earned) ?? [];

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Your next actions</p>
          <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">My placement plan</h1>
          <p className="text-sm text-on-surface-variant mt-1">One achievable plan combining priorities, roadmap progress and professional milestones.</p>
        </header>

        <ReadinessCard
          readiness={dashboard.data.readiness}
          targetRole={dashboard.data.targetRole}
          prominent
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TodayPlan plan={dashboard.data.plan} />
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
            <div className="flex justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Four-week roadmap</p>
                <h2 className="font-headline text-lg font-black mt-1">{currentWeek ? `Week ${currentWeek.week}: ${currentWeek.theme}` : 'Roadmap complete'}</h2>
              </div>
              <span className="text-sm font-black tabular-nums">{roadmap.data?.progress?.percentage ?? 0}%</span>
            </div>
            <div className="h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${roadmap.data?.progress?.percentage ?? 0}%` }} />
            </div>
            {currentWeek && <ul className="mt-4 space-y-2">{currentWeek.tasks.slice(0, 3).map((task) => <li key={task.id} className="flex gap-2 text-sm"><span className="material-symbols-outlined text-base text-outline">{task.done ? 'check_circle' : 'radio_button_unchecked'}</span><span className={task.done ? 'line-through text-on-surface-variant' : 'font-bold'}>{task.label}</span></li>)}</ul>}
            <Link to="/roadmap" className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-primary hover:underline">See full roadmap <span className="material-symbols-outlined text-base">arrow_forward</span></Link>
          </section>
        </div>

        <Link to="/career-lab" className="block rounded-xl bg-inverse-surface text-white p-5 hover:opacity-95">
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">Explore before you commit</p>
          <div className="flex items-center justify-between gap-4 mt-1"><div><h2 className="font-headline text-lg font-black">Open Career Lab</h2><p className="text-sm opacity-75 mt-1">Simulate job gaps and readiness, ask the career mentor, review a GitHub project, or find referral-ready alumni.</p></div><span className="material-symbols-outlined">arrow_forward</span></div>
        </Link>

        <ProgressChart />

        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Professional milestones</p><p className="text-sm mt-1">Evidence-backed progress, kept secondary to the work itself.</p></div>
            <Link to="/achievements" className="text-sm font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {earned.slice(0, 4).map((badge) => <div key={badge.key} className="rounded-lg bg-surface-container-low p-3"><span className="material-symbols-outlined text-primary">{badge.icon}</span><p className="text-sm font-bold mt-1">{badge.label}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{badge.tier}</p></div>)}
            {earned.length === 0 && <p className="col-span-full text-sm text-on-surface-variant">Your first milestone will appear automatically when the evidence is recorded.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
