import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import MatchBadge from '../features/jobs/MatchBadge.jsx';

const TYPE_LABELS = {
  'full-time': 'Full-time',
  internship: 'Internship',
  campus: 'Campus',
  apprenticeship: 'Apprenticeship',
  hackathon: 'Hackathon',
};

function daysLeft(deadline) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline) - Date.now()) / 86_400_000);
  return days < 0 ? null : days;
}

function JobCard({ job }) {
  const left = daysLeft(job.deadline);
  const missing = job.match?.missing?.filter((item) => item.required) ?? [];

  return (
    <Link
      to={`/jobs/${job._id}`}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 flex flex-col hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h2 className="font-bold text-sm leading-snug truncate">{job.title}</h2>
          <p className="text-xs text-on-surface-variant truncate">{job.company}</p>
        </div>
        {job.match && <MatchBadge score={job.match.score} />}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant">
          {TYPE_LABELS[job.type]}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant capitalize">
          {job.workMode}
        </span>
        {job.compensation && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant">
            {job.compensation}
          </span>
        )}
      </div>

      {job.match && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.match.matched.slice(0, 4).map((skill) => (
            <span
              key={skill.name}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-2xl bg-green-100 text-green-800"
            >
              ✓ {skill.name}
            </span>
          ))}
          {missing.slice(0, 2).map((skill) => (
            <span
              key={skill.name}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant"
            >
              ○ {skill.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-outline-variant/60 flex items-center justify-between gap-2 text-xs">
        <span className="text-on-surface-variant truncate">{job.location || 'Location flexible'}</span>
        {left !== null && (
          <span className={`font-bold shrink-0 ${left <= 7 ? 'text-primary' : 'text-on-surface-variant'}`}>
            {left === 0 ? 'Closes today' : `${left}d left`}
          </span>
        )}
      </div>

      {job.stage && (
        <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-primary">
          {job.stage === 'saved' ? 'Saved' : job.stage}
        </span>
      )}
    </Link>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [view, setView] = useState('all');
  const [sort, setSort] = useState('match');

  const debounced = useDebouncedValue(search, 350);

  const query = useMemo(() => {
    const params = new URLSearchParams({ sort, limit: '24' });
    if (debounced) params.set('search', debounced);
    if (type) params.set('type', type);
    if (workMode) params.set('workMode', workMode);
    if (view === 'saved') params.set('saved', 'true');
    if (view === 'applied') params.set('applied', 'true');
    return params.toString();
  }, [debounced, type, workMode, view, sort]);

  const { data, loading, error, refetch } = useApiResource(`/jobs?${query}`);
  const jobs = data?.jobs ?? [];

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            Jobs & opportunities
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Ranked by how well your verified skills and evidence match each role.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'saved', label: 'Saved' },
            { key: 'applied', label: 'Applied' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              aria-pressed={view === item.key}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                view === item.key
                  ? 'bg-inverse-surface text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full flex-1 min-w-[12rem] focus-within:ring-2 focus-within:ring-primary/20">
            <span className="material-symbols-outlined text-outline text-base">search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search role or company…"
              type="search"
              aria-label="Search jobs"
              className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-outline"
            />
          </div>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by type"
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-full px-3 py-1.5 text-sm font-bold cursor-pointer"
          >
            <option value="">All types</option>
            {(data?.filters?.types ?? []).map((item) => (
              <option key={item} value={item}>
                {TYPE_LABELS[item]}
              </option>
            ))}
          </select>

          <select
            value={workMode}
            onChange={(event) => setWorkMode(event.target.value)}
            aria-label="Filter by work mode"
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-full px-3 py-1.5 text-sm font-bold cursor-pointer capitalize"
          >
            <option value="">Any mode</option>
            {(data?.filters?.workModes ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort jobs"
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-full px-3 py-1.5 text-sm font-bold cursor-pointer"
          >
            <option value="match">Best match</option>
            <option value="deadline">Closing soonest</option>
          </select>
        </div>

        {loading && !data && <LoadingBlock label="Finding opportunities" />}
        {error && <ErrorBlock error={error} onRetry={refetch} />}

        {!loading && !error && jobs.length === 0 && (
          <EmptyBlock
            icon="work_off"
            title={view === 'all' ? 'No jobs posted yet' : `Nothing ${view}`}
            description={
              view === 'all'
                ? 'Your placement office has not posted anything here yet.'
                : 'Jobs you save or apply to will show up here.'
            }
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}
