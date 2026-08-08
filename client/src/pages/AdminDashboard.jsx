import React, { useMemo, useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useAuth } from '../context/AuthContext.jsx';
import StudentDetail from '../features/admin/StudentDetail.jsx';
import JobMatch from '../features/admin/JobMatch.jsx';
import Insights from '../features/admin/Insights.jsx';
import Drives from '../features/admin/Drives.jsx';
import Placements from '../features/admin/Placements.jsx';
import Calendar from '../features/admin/Calendar.jsx';
import Companies from '../features/admin/Companies.jsx';
import Training from '../features/admin/Training.jsx';
import Alumni from '../features/admin/Alumni.jsx';

const BAND_STYLES = {
  ready: 'bg-green-100 text-green-800',
  progressing: 'bg-secondary-container/60 text-on-secondary-container',
  'at-risk': 'bg-error-container/25 text-on-error-container',
};

function ReadinessCell({ value, band }) {
  return (
    <div className="flex items-center gap-2 min-w-[7rem]">
      <div className="h-1.5 w-14 bg-surface-container rounded-full overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full ${
            band === 'ready' ? 'bg-green-500' : band === 'progressing' ? 'bg-secondary-fixed-dim' : 'bg-error'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-black tabular-nums">{value}%</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('match');

  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [band, setBand] = useState('');
  const [sort, setSort] = useState('readiness');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '25', sort });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (branch) params.set('branch', branch);
    if (year) params.set('graduationYear', year);
    if (band) params.set('band', band);
    return params.toString();
  }, [debouncedSearch, branch, year, band, sort, page]);

  const { data, loading, error, refetch } = useApiResource(`/admin/students?${query}`);
  const { data: filters } = useApiResource('/admin/students/filters');

  const students = data?.students ?? [];
  const summary = data?.summary;
  const pagination = data?.pagination;

  /** Any filter change restarts pagination, or page 3 of a new filter is empty. */
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 pt-16 lg:pt-6 max-w-2xl mx-auto">
        <EmptyBlock
          icon="lock"
          title="Admins only"
          description="This area shows other students' progress, so it is limited to staff accounts."
        />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-3">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Placement office</p>
          <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">
            {tab === 'match'
              ? 'Shortlist candidates'
              : tab === 'insights'
                ? 'Cohort insights'
                : tab === 'drives'
                  ? 'Placement drives'
                  : tab === 'placements'
                    ? 'Offers and placement report'
                    : tab === 'calendar'
                      ? 'Placement calendar'
                      : tab === 'companies'
                        ? 'Company relationships'
                        : tab === 'training'
                          ? 'Training and its effect'
                          : tab === 'alumni'
                            ? 'Placement history'
                            : 'Student progress'}
          </h1>
        </header>

        {/*
          Seven tabs do not fit a phone. The strip scrolls inside itself —
          bled to the page edges so a half-visible tab signals there is more —
          rather than wrapping to a second row or overflowing the document.
        */}
        <div
          className="flex gap-2 overflow-x-auto -mx-5 px-5 md:-mx-8 md:px-8 lg:mx-0 lg:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {[
            { key: 'match', label: 'Match to a job' },
            { key: 'cohort', label: 'Browse cohort' },
            { key: 'drives', label: 'Drives' },
            { key: 'placements', label: 'Placements' },
            { key: 'calendar', label: 'Calendar' },
            { key: 'companies', label: 'Companies' },
            { key: 'training', label: 'Training' },
            { key: 'alumni', label: 'History' },
            { key: 'insights', label: 'Insights' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                tab === item.key
                  ? 'bg-inverse-surface text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'match' && <JobMatch />}
        {tab === 'drives' && <Drives />}
        {tab === 'placements' && <Placements />}
        {tab === 'calendar' && <Calendar />}
        {tab === 'companies' && <Companies />}
        {tab === 'training' && <Training />}
        {tab === 'alumni' && <Alumni />}
        {tab === 'insights' && <Insights />}

        {/* Cohort summary */}
        {tab === 'cohort' && summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60">
              <p className="text-2xl font-black font-headline">{summary.total}</p>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">
                Students
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60">
              <p className="text-2xl font-black font-headline">{summary.averageReadiness}%</p>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">
                Avg readiness
              </p>
            </div>
            {summary.bands.slice(0, 2).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => withReset(setBand)(band === item.key ? '' : item.key)}
                className={`text-left rounded-xl p-4 border transition-colors ${
                  band === item.key
                    ? 'border-primary bg-primary-container/10'
                    : 'border-outline-variant/60 bg-surface-container-lowest hover:border-primary/30'
                }`}
              >
                <p className="text-2xl font-black font-headline">{item.count}</p>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">
                  {item.label}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        {tab === 'cohort' && (
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full focus-within:ring-2 focus-within:ring-primary/20 flex-1 min-w-[14rem]">
            <span className="material-symbols-outlined text-outline text-lg">search</span>
            <input
              value={search}
              onChange={(event) => withReset(setSearch)(event.target.value)}
              placeholder="Search name or email…"
              type="search"
              aria-label="Search students"
              className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-outline"
            />
          </div>

          <select
            value={branch}
            onChange={(event) => withReset(setBranch)(event.target.value)}
            aria-label="Filter by branch"
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-4 py-2 text-sm font-bold cursor-pointer"
          >
            <option value="">All branches</option>
            {(filters?.branches ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => withReset(setYear)(event.target.value)}
            aria-label="Filter by graduation year"
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-4 py-2 text-sm font-bold cursor-pointer"
          >
            <option value="">All years</option>
            {(filters?.graduationYears ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={band}
            onChange={(event) => withReset(setBand)(event.target.value)}
            aria-label="Filter by readiness band"
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-4 py-2 text-sm font-bold cursor-pointer"
          >
            <option value="">All readiness</option>
            {(filters?.bands ?? []).map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort students"
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-4 py-2 text-sm font-bold cursor-pointer"
          >
            <option value="readiness">Most ready</option>
            <option value="readiness-asc">Least ready</option>
            <option value="solved">Most solved</option>
            <option value="name">Name</option>
          </select>

          <a
            href={`/api/admin/students/export?${new URLSearchParams({
              ...(branch && { branch }),
              ...(year && { graduationYear: year }),
              ...(band && { band }),
              ...(search && { search }),
            })}`}
            className="px-4 py-2 rounded-full bg-surface-container text-sm font-bold hover:bg-surface-container-high transition-colors"
          >
            Export CSV
          </a>

          {(search || branch || year || band) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setBranch('');
                setYear('');
                setBand('');
                setPage(1);
              }}
              className="px-4 py-2 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Clear
            </button>
          )}
        </div>

        )}

        {tab === 'cohort' && loading && !data && <LoadingBlock label="Loading cohort" />}
        {tab === 'cohort' && error && <ErrorBlock error={error} onRetry={refetch} />}

        {tab === 'cohort' && !loading && !error && students.length === 0 && (
          <EmptyBlock
            icon="group_off"
            title="No students match"
            description="Try widening the filters."
          />
        )}

        {/* Cohort table */}
        {tab === 'cohort' && students.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[52rem]">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
                    <th scope="col" className="px-4 py-2.5 font-black">Student</th>
                    <th scope="col" className="px-4 py-2.5 font-black">Branch</th>
                    <th scope="col" className="px-4 py-2.5 font-black">Readiness</th>
                    <th scope="col" className="px-4 py-2.5 font-black">Solved</th>
                    <th scope="col" className="px-4 py-2.5 font-black">Tests</th>
                    <th scope="col" className="px-4 py-2.5 font-black">Interviews</th>
                    <th scope="col" className="px-4 py-2.5 font-black">Skills</th>
                    <th scope="col" className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student._id}
                      className="border-t border-outline-variant/60 hover:bg-surface-container-low/60"
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-sm">{student.name}</p>
                        <p className="text-xs text-on-surface-variant truncate max-w-[14rem]">
                          {student.email}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-on-surface-variant">
                        {student.branch || '—'}
                        {student.graduationYear ? ` · ${student.graduationYear}` : ''}
                      </td>
                      <td className="px-4 py-2.5">
                        <ReadinessCell value={student.readiness} band={student.band} />
                      </td>
                      <td className="px-4 py-2.5 text-sm font-bold tabular-nums">{student.solved}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="font-bold">{student.testsPassed}</span>
                        <span className="text-on-surface-variant">/{student.testsTaken}</span>
                        {student.testsTaken > 0 && (
                          <span className="text-on-surface-variant"> · {student.testAverage}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {student.interviewsCompleted > 0 ? (
                          <>
                            <span className="font-bold">{student.interviewsCompleted}</span>
                            <span className="text-on-surface-variant"> · {student.interviewAverage}%</span>
                          </>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="font-bold">{student.verifiedSkills}</span>
                        <span className="text-on-surface-variant">/{student.skillCount} verified</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                              BAND_STYLES[student.band]
                            }`}
                          >
                            {student.band === 'at-risk' ? 'At risk' : student.band}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelected(student)}
                            aria-label={`View ${student.name}`}
                            className="w-7 h-7 rounded-full text-outline-variant hover:text-primary hover:bg-primary/10 flex items-center justify-center shrink-0"
                          >
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant/60">
                <p className="text-xs text-on-surface-variant font-medium">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} students
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="px-4 py-1.5 rounded-full bg-surface-container text-sm font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPage((value) => value + 1)}
                    className="px-4 py-1.5 rounded-full bg-surface-container text-sm font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <StudentDetail student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
