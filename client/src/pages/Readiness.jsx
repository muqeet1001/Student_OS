import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import ProgressChart from '../features/dashboard/ProgressChart.jsx';
import ReadinessCard from '../features/dashboard/ReadinessCard.jsx';
import ReadinessMethodology from '../features/dashboard/ReadinessMethodology.jsx';
import TargetRole from '../features/dashboard/TargetRole.jsx';
import ActivityHeatmap from '../features/dashboard/ActivityHeatmap.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const ACTIONS = {
  skills: '/skills',
  coding: '/coding-practice',
  resume: '/resume-builder',
  interview: '/ai-interview',
  projects: '/profile',
};

function SignalSummary({ readiness }) {
  const ordered = [...readiness.components].sort((a, b) => b.value - a.value);
  const strongest = ordered[0];
  const weakest = ordered.at(-1);
  const nextMilestone = readiness.score < 35 ? 35 : readiness.score < 60 ? 60 : readiness.score < 80 ? 80 : 100;

  const items = [
    { label: 'Current score', value: `${readiness.score}/100`, detail: 'Weighted readiness' },
    { label: 'Strongest signal', value: strongest.label, detail: `${strongest.value}%` },
    { label: 'Priority signal', value: weakest.label, detail: `${weakest.value}%` },
    {
      label: readiness.score >= 80 ? 'Headroom' : 'Next milestone',
      value: readiness.score >= 80 ? `${100 - readiness.score} pts` : `${nextMilestone - readiness.score} pts`,
      detail: readiness.score >= 80 ? 'to a perfect score' : `to reach ${nextMilestone}%`,
    },
  ];

  return (
    <section aria-label="Readiness at a glance" className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {items.map((item) => (
        <article key={item.label} className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">{item.label}</p>
          <p className="font-headline text-xl font-black mt-2">{item.value}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function ProjectionSimulator({ readiness }) {
  const [values, setValues] = useState({});
  const projected = Math.round(
    readiness.components.reduce(
      (total, component) => total + (values[component.key] ?? component.value) * component.weight,
      0,
    ),
  );
  const change = projected - readiness.score;

  return (
    <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">What-if view</p>
          <h2 className="font-headline text-lg font-black mt-1">See what moves your score</h2>
          <p className="text-xs text-on-surface-variant mt-1">Adjust a signal to compare potential outcomes before choosing your next action.</p>
        </div>
        <div className="rounded-xl bg-inverse-surface text-white px-5 py-3 shrink-0">
          <p className="font-headline text-2xl font-black tabular-nums">{projected}%</p>
          <p className="text-[10px] uppercase tracking-wider opacity-70">{change > 0 ? `+${change} projected` : 'Current score'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-5">
        {readiness.components.map((component) => {
          const value = values[component.key] ?? component.value;
          return (
            <label key={component.key} className="rounded-lg bg-surface-container-low p-4">
              <span className="flex justify-between gap-2 text-xs font-bold">
                <span>{component.label}</span>
                <span className="tabular-nums">{value}%</span>
              </span>
              <input
                type="range"
                min={component.value}
                max="100"
                value={value}
                onChange={(event) => setValues((current) => ({ ...current, [component.key]: Number(event.target.value) }))}
                className="w-full mt-3 accent-primary"
                aria-label={`Simulated ${component.label} score`}
              />
              <span className="text-[10px] text-on-surface-variant">{Math.round(component.weight * 100)}% weight</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-on-surface-variant mt-3">Simulation only. Your real score changes when Student OS records completed evidence.</p>
    </section>
  );
}

function ImprovementActions({ readiness, recommendations }) {
  const byComponent = useMemo(
    () => [...readiness.components].sort((a, b) => a.value - b.value),
    [readiness.components],
  );

  return (
    <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Improvement view</p>
          <h2 className="font-headline text-lg font-black mt-1">Work from the biggest gap down</h2>
        </div>
        <Link to="/my-plan" className="text-xs font-bold text-primary hover:underline">Open complete plan</Link>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        {byComponent.slice(0, 3).map((component, index) => {
          const recommendation = recommendations.find((item) => item.text?.toLowerCase().includes(component.label.toLowerCase()));
          return (
            <li key={component.key}>
              <Link to={recommendation?.action?.to ?? ACTIONS[component.key]} className="h-full flex gap-3 rounded-xl bg-surface-container-low p-4 hover:bg-surface-container">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-black shrink-0">{index + 1}</span>
                <span>
                  <span className="block text-sm font-black">Improve {component.label.toLowerCase()}</span>
                  <span className="block text-xs text-on-surface-variant mt-1">Currently {component.value}% · {Math.round(component.weight * 100)}% of readiness</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3">Start action <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EvidenceLedger({ readiness }) {
  async function dispute() {
    const note = window.prompt('What evidence or score appears incorrect?');
    if (!note?.trim()) return;
    try { await api.post('/reviews', { kind: 'readiness', note: note.trim() }); window.alert('Your readiness review was sent to the placement office.'); }
    catch (error) { window.alert(error.message || 'Could not request a readiness review.'); }
  }
  return <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 md:p-6"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Evidence ledger</p><h2 className="font-headline text-lg font-black mt-1">Why this score is {readiness.score}</h2><p className="text-xs text-on-surface-variant mt-1">Formula {readiness.formulaVersion} · Updated {new Date(readiness.lastUpdatedAt).toLocaleString('en-IN')}</p></div><button type="button" onClick={dispute} className="px-4 py-2 rounded-full bg-surface-container text-sm font-bold">Report incorrect evidence</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-4">{readiness.components.map((component) => <article key={component.key} className="rounded-lg bg-surface-container-low p-3"><div className="flex justify-between gap-2"><p className="text-sm font-bold">{component.label}</p><span className="font-black text-sm">{component.value}%</span></div><p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">{component.basis}</p></article>)}</div></section>;
}

export default function Readiness() {
  const dashboard = useApiResource('/dashboard');
  const benchmarks = useApiResource('/journey/benchmarks');
  const [roleOverride, setRoleOverride] = useState(undefined);

  if (dashboard.loading && !dashboard.data) return <LoadingBlock label="Calculating readiness" className="min-h-dvh" />;
  if (dashboard.error && !dashboard.data) return <div className="p-6 pt-16 lg:pt-6"><ErrorBlock error={dashboard.error} onRetry={dashboard.refetch} /></div>;

  const { readiness, availableRoles, recommendations } = dashboard.data;
  const targetRole = roleOverride === undefined ? dashboard.data.targetRole : roleOverride;

  async function handleRoleChange(nextRole) {
    setRoleOverride(nextRole);
    if (nextRole) {
      await dashboard.refetch({ quiet: true });
      setRoleOverride(undefined);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-on-surface">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Priority one</p>
          <h1 className="font-headline text-3xl font-black mt-1">Placement readiness</h1>
          <p className="text-sm text-on-surface-variant mt-1">Your current position, why it changed, and the shortest path to improve it.</p>
        </header>

        <SignalSummary readiness={readiness} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><ReadinessCard readiness={readiness} targetRole={targetRole} prominent showReportLink={false} /></div>
          <TargetRole targetRole={targetRole} availableRoles={availableRoles} onChange={handleRoleChange} />
        </div>

        <ImprovementActions readiness={readiness} recommendations={recommendations} />
        <EvidenceLedger readiness={readiness} />
        {benchmarks.data && <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Cohort context</p><h2 className="font-headline text-lg font-black mt-1">Benchmark, not a ranking</h2></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">{[[`${readiness.score}%`, 'Your readiness'], [`${benchmarks.data.comparableAverage}%`, `${benchmarks.data.context?.branch || 'Similar'} ${benchmarks.data.context?.graduationYear || ''}`], [`${benchmarks.data.institutionAverage}%`, 'Institution average'], [`${benchmarks.data.percentile ?? 0}th`, 'Institution percentile']].map(([value, label]) => <div key={label} className="rounded-lg bg-surface-container-low p-3"><p className="text-xl font-black">{value}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</p></div>)}</div><p className="text-xs text-on-surface-variant mt-3">{benchmarks.data.note}</p></section>}
        <ActivityHeatmap />
        <ReadinessMethodology readiness={readiness} />
        <ProjectionSimulator readiness={readiness} />
        <ProgressChart />
      </div>
    </main>
  );
}
