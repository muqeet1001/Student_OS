import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AdminScopeProvider, useAdminScope } from '../context/AdminScopeContext.jsx';
import AdminOverview from '../features/admin/AdminOverview.jsx';
import AdminStudents from '../features/admin/AdminStudents.jsx';
import AdminSettings from '../features/admin/AdminSettings.jsx';
import Drives from '../features/admin/Drives.jsx';
import Calendar from '../features/admin/Calendar.jsx';
import Companies from '../features/admin/Companies.jsx';
import Announcements from '../features/admin/Announcements.jsx';
import Training from '../features/admin/Training.jsx';
import AdminActivity from '../features/admin/AdminActivity.jsx';
import ActionCentre from '../features/admin/ActionCentre.jsx';
import ReportsWorkspace from '../features/admin/ReportsWorkspace.jsx';

const PAGES = {
  overview: ['Today', 'Your priorities, deadlines and placement-health signals.'],
  students: ['Students', 'One evidence-backed view of the active graduating cohort.'],
  actions: ['Action Centre', 'Interventions, owned tasks, reviews and mentoring in one queue.'],
  companies: ['Companies & contacts', 'Recruiter relationships, touchpoints and dated follow-ups.'],
  drives: ['Opportunities & drives', 'Run the complete hiring pipeline from requirement to selection.'],
  calendar: ['Calendar & attendance', 'Interview panels, event clashes, slots and check-in.'],
  communications: ['Communications', 'Targeted placement updates with audience and delivery evidence.'],
  training: ['Training intelligence', 'Turn skill gaps into programmes and measure their effect.'],
  reports: ['Reports & analytics', 'Season outcomes, skill intelligence and historical trends.'],
  settings: ['Placement settings', 'Season, scoring governance, providers and institution configuration.'],
};

const LEGACY = { interventions: 'actions', tasks: 'actions', reviews: 'actions', matching: 'drives', outcomes: 'reports', activity: 'settings' };

function AdminPage() {
  const { section = 'overview' } = useParams();
  const scope = useAdminScope();
  if (LEGACY[section]) return <Navigate to={`/admin/${LEGACY[section]}?year=${scope.graduationYear}`} replace />;
  const meta = PAGES[section];
  if (!meta) return <Navigate to={`/admin/overview?year=${scope.graduationYear}`} replace />;

  const content = {
    overview: <AdminOverview />,
    students: <AdminStudents />,
    actions: <ActionCentre />,
    companies: <Companies />,
    drives: <Drives />,
    calendar: <Calendar />,
    communications: <Announcements graduationYear={scope.graduationYear} />,
    training: <Training />,
    reports: <ReportsWorkspace />,
    settings: <div className="space-y-8"><AdminSettings /><section className="pt-6 border-t border-outline-variant/60"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Governance</p><h2 className="font-headline text-xl font-black mt-1">Activity history</h2></div><AdminActivity /></section></div>,
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
