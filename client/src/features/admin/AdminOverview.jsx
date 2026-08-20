import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useAdminScope } from '../../context/AdminScopeContext.jsx';
import { api } from '../../lib/api.js';

const shortDate = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  : 'No date';

const dueTone = (value) => value && new Date(value) < new Date()
  ? 'text-on-error-container bg-error-container/25'
  : 'text-on-surface-variant bg-surface-container';

function Section({ title, eyebrow, action, children }) {
  return <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden">
    <header className="flex items-center justify-between gap-3 p-5 border-b border-outline-variant/60">
      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h2 className="font-headline text-lg font-black mt-0.5">{title}</h2></div>
      {action}
    </header>
    {children}
  </section>;
}

function EmptyLine({ children }) {
  return <p className="px-5 py-8 text-sm text-on-surface-variant text-center">{children}</p>;
}

export default function AdminOverview() {
  const { graduationYear } = useAdminScope();
  const path = `/admin/overview?graduationYear=${graduationYear}`;
  const { data, loading, error, refetch } = useApiResource(path);

  if (loading && !data) return <LoadingBlock label="Building today's placement plan" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { summary, actions, interventionCases, drives, recruiterFollowUps, reviews, mentoring, training } = data;
  const withYear = (pathname) => `${pathname}?year=${graduationYear}`;

  async function complete(actionId) {
    await api.patch(`/journey/actions/${actionId}`, { status: 'done', resolution: 'Completed by placement office' });
    refetch({ quiet: true });
  }

  return <div className="space-y-5">
    <section className="rounded-2xl bg-inverse-surface text-white p-5 md:p-6 overflow-hidden relative">
      <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-primary/30 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Placement command centre</p>
          <h2 className="font-headline text-2xl md:text-3xl font-black mt-1">Here is what needs attention today.</h2>
          <p className="text-sm text-white/65 mt-2 max-w-2xl">{summary.overdueActions
            ? `${summary.overdueActions} overdue action${summary.overdueActions === 1 ? '' : 's'} need an owner response.`
            : 'No assigned actions are overdue. Focus on upcoming drives and high-risk students.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={withYear('/admin/drives')} className="px-4 py-2.5 rounded-xl bg-white text-inverse-surface text-sm font-black">Create drive</Link>
          <Link to={withYear('/admin/communications')} className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm font-bold">Send update</Link>
        </div>
      </div>
    </section>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        [summary.students, 'Total students', 'groups'],
        [summary.eligible, 'Eligible students', 'person_check'],
        [summary.ready, 'Placement ready', 'verified'],
        [summary.placed, 'Students placed', 'workspace_premium'],
        [summary.companies, 'Companies', 'domain'],
        [summary.offers, 'Total offers', 'contract'],
        [summary.averagePackage ? `₹${(summary.averagePackage / 100000).toFixed(1)}L` : '—', 'Average package', 'payments'],
        [`${summary.placementRate}%`, 'Placement percentage', 'monitoring'],
      ].map(([value, label, icon]) => <div key={label} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        <p className="text-2xl font-black font-headline tabular-nums mt-2">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant mt-0.5">{label}</p>
      </div>)}
    </div>

    <div className="flex flex-wrap gap-2">
      {[
        [summary.interventionCases, 'students need support'],
        [summary.openDrives, 'active drives'],
        [summary.pendingReviews, 'reviews waiting'],
        [summary.overdueActions, 'actions overdue'],
      ].map(([value, label]) => <span key={label} className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold"><strong className="text-primary">{value}</strong> {label}</span>)}
    </div>

    <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-5 items-start">
      <div className="space-y-5">
        <Section title="Student cases" eyebrow="Prioritised intervention" action={<Link className="text-xs font-black text-primary" to={withYear('/admin/interventions')}>Open queue</Link>}>
          {interventionCases.length === 0 ? <EmptyLine>Every active student is currently on track.</EmptyLine> : <ul className="divide-y divide-outline-variant/60">
            {interventionCases.slice(0, 6).map((student) => <li key={student._id} className="p-4 flex items-center gap-3 hover:bg-surface-container-low/60">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${student.signals.some((signal) => signal.severity === 'urgent') ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>{student.signals.length}</div>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{student.name}</p><p className="text-xs text-on-surface-variant truncate">{student.signals.map((signal) => signal.label).join(' · ')}</p></div>
              <div className="text-right shrink-0"><p className="text-sm font-black tabular-nums">{student.readiness}%</p><p className="text-[10px] text-outline">readiness</p></div>
            </li>)}
          </ul>}
        </Section>

        <Section title="Recruitment pipeline" eyebrow="Drives needing action" action={<Link className="text-xs font-black text-primary" to={withYear('/admin/drives')}>All drives</Link>}>
          {drives.length === 0 ? <EmptyLine>No active drive needs attention.</EmptyLine> : <ul className="divide-y divide-outline-variant/60">
            {drives.map((drive) => <li key={drive._id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant">business_center</span></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{drive.company} · {drive.role}</p><p className="text-xs text-on-surface-variant truncate">{drive.nextAction || 'Set the next action for this drive'} · {drive.shortlistCount} shortlisted</p></div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${dueTone(drive.nextActionDueAt || drive.applicationDeadline || drive.driveDate)}`}>{shortDate(drive.nextActionDueAt || drive.applicationDeadline || drive.driveDate)}</span>
            </li>)}
          </ul>}
        </Section>
      </div>

      <div className="space-y-5">
        <Section title="My work" eyebrow="Owned actions" action={<Link className="text-xs font-black text-primary" to={withYear('/admin/tasks')}>See all</Link>}>
          {actions.length === 0 ? <EmptyLine>No assigned actions are open.</EmptyLine> : <ul className="divide-y divide-outline-variant/60">
            {actions.slice(0, 6).map((item) => <li key={item._id} className="p-4">
              <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex gap-2 items-center flex-wrap"><p className="text-sm font-bold">{item.title}</p><span className="text-[9px] font-black uppercase text-primary">{item.priority}</span></div><p className="text-xs text-on-surface-variant mt-0.5">{item.owner?.name} · {shortDate(item.dueAt)}</p></div><button type="button" onClick={() => complete(item._id)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-green-100 hover:text-green-800 flex items-center justify-center" aria-label={`Complete ${item.title}`}><span className="material-symbols-outlined text-base">check</span></button></div>
            </li>)}
          </ul>}
        </Section>

        <Section title="Relationship follow-ups" eyebrow="Company CRM" action={<Link className="text-xs font-black text-primary" to={withYear('/admin/companies')}>Companies</Link>}>
          {recruiterFollowUps.length === 0 ? <EmptyLine>No company follow-up is due in the next 14 days.</EmptyLine> : <ul className="divide-y divide-outline-variant/60">
            {recruiterFollowUps.map((company) => <li key={company._id} className="p-4"><p className="text-sm font-bold">{company.name}</p><p className="text-xs text-on-surface-variant mt-0.5">{company.nextAction || 'Relationship follow-up'} · {shortDate(company.nextFollowUpAt)}</p></li>)}
          </ul>}
        </Section>

        <Section title="Upcoming commitments" eyebrow="Reviews, mentoring and training">
          {[...reviews.map((item) => ({ id: `r-${item._id}`, title: `${item.student?.name}: ${item.kind} review`, meta: 'Review waiting' })), ...mentoring.map((item) => ({ id: `m-${item._id}`, title: `${item.student?.name}: ${item.topic}`, meta: 'Mentoring request' })), ...training.map((item) => ({ id: `t-${item._id}`, title: item.title, meta: `${shortDate(item.startsAt)} · ${item.venue || 'Venue pending'}` }))].slice(0, 6).map((item) => <div key={item.id} className="px-4 py-3 border-t first:border-t-0 border-outline-variant/60"><p className="text-sm font-bold">{item.title}</p><p className="text-xs text-on-surface-variant mt-0.5">{item.meta}</p></div>)}
          {!reviews.length && !mentoring.length && !training.length && <EmptyLine>No upcoming commitments.</EmptyLine>}
        </Section>
      </div>
    </div>
  </div>;
}
