import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AdminScopeProvider, useAdminScope } from '../context/AdminScopeContext.jsx';
import AdminOverview from '../features/admin/AdminOverview.jsx';
import AdminStudents from '../features/admin/AdminStudents.jsx';
import AdminTasks from '../features/admin/AdminTasks.jsx';
import AdminSettings from '../features/admin/AdminSettings.jsx';
import InterventionQueue from '../features/admin/InterventionQueue.jsx';
import ReviewQueue from '../features/admin/ReviewQueue.jsx';
import JobMatch from '../features/admin/JobMatch.jsx';
import Drives from '../features/admin/Drives.jsx';
import Calendar from '../features/admin/Calendar.jsx';
import Companies from '../features/admin/Companies.jsx';
import Announcements from '../features/admin/Announcements.jsx';
import Insights from '../features/admin/Insights.jsx';
import Training from '../features/admin/Training.jsx';
import Placements from '../features/admin/Placements.jsx';
import Alumni from '../features/admin/Alumni.jsx';
import MentoringQueue from '../features/admin/MentoringQueue.jsx';
import AdminActivity from '../features/admin/AdminActivity.jsx';

const PAGES = {
  overview: ['Today', 'Your priorities, deadlines and placement-health signals.'],
  students: ['Students', 'One evidence-backed view of the active graduating cohort.'],
  interventions: ['Interventions', 'Grouped student cases with owners, priority and due dates.'],
  tasks: ['Tasks', 'Track every staff-assigned action through completion.'],
  companies: ['Companies & contacts', 'Recruiter relationships, touchpoints and dated follow-ups.'],
  drives: ['Opportunities & drives', 'Run the complete hiring pipeline from requirement to selection.'],
  matching: ['Eligibility & matching', 'Explainable shortlisting for a new or existing role.'],
  calendar: ['Calendar & attendance', 'Interview panels, event clashes, slots and check-in.'],
  reviews: ['Reviews & mentoring', 'Human feedback and student support requests.'],
  communications: ['Communications', 'Targeted placement updates with audience and delivery evidence.'],
  training: ['Training intelligence', 'Turn skill gaps into programmes and measure their effect.'],
  outcomes: ['Outcomes & reports', 'Offers, placement rate, package distribution and alumni history.'],
  settings: ['Placement settings', 'Season, scoring governance, providers and institution configuration.'],
  activity: ['Activity history', 'An auditable timeline of placement-office changes.'],
};

function AdminPage() {
  const { section = 'overview' } = useParams();
  const scope = useAdminScope();
  const meta = PAGES[section];
  if (!meta) return <Navigate to={`/admin/overview?year=${scope.graduationYear}`} replace />;

  const content = {
    overview: <AdminOverview />,
    students: <AdminStudents />,
    interventions: <InterventionQueue />,
    tasks: <AdminTasks />,
    companies: <Companies />,
    drives: <Drives />,
    matching: <JobMatch graduationYear={scope.graduationYear} />,
    calendar: <Calendar />,
    reviews: <div className="space-y-5"><ReviewQueue graduationYear={scope.graduationYear} /><MentoringQueue /></div>,
    communications: <Announcements graduationYear={scope.graduationYear} />,
    training: <div className="space-y-8"><Insights graduationYear={scope.graduationYear} /><section className="pt-6 border-t border-outline-variant/60"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Act on the gaps</p><h2 className="font-headline text-xl font-black mt-1">Programmes and measured impact</h2></div><Training /></section></div>,
    outcomes: <div className="space-y-8"><Placements graduationYear={scope.graduationYear} /><section className="pt-6 border-t border-outline-variant/60"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Historical context</p><h2 className="font-headline text-xl font-black mt-1">Placement history by graduating class</h2></div><Alumni /></section></div>,
    settings: <AdminSettings />,
    activity: <AdminActivity />,
  }[section];

  return <div className="bg-background text-on-surface min-h-dvh">
    <div className="max-w-[92rem] mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-12 space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Placement office</p><h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">{meta[0]}</h1><p className="text-sm text-on-surface-variant mt-1">{meta[1]}</p></div>
        <label className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 shadow-sm"><span className="material-symbols-outlined text-primary">calendar_month</span><span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant hidden sm:block">Placement season</span><select aria-label="Placement season" value={scope.graduationYear} onChange={(event) => scope.setGraduationYear(Number(event.target.value))} className="bg-transparent border-0 outline-none text-sm font-black cursor-pointer">{scope.availableYears.map((year) => <option key={year} value={year}>Class of {year}</option>)}</select></label>
      </header>
      {content}
    </div>
  </div>;
}

export default function AdminDashboard() {
  return <AdminScopeProvider><AdminPage /></AdminScopeProvider>;
}
