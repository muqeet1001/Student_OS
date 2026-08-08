import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

const DIFFICULTY_STYLES = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-tertiary-container text-on-tertiary-container',
  hard: 'bg-error-container/30 text-on-error-container',
};

function StatBar({ label, solved, total, color }) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="relative h-32 bg-neutral-800 rounded-2xl overflow-hidden">
        <div
          className={`absolute bottom-0 w-full ${color} transition-all duration-500`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <div className="text-center">
        <p className="font-bold capitalize">{label}</p>
        <p className="text-xs text-neutral-500">
          {solved}/{total}
        </p>
      </div>
    </div>
  );
}

export default function CodingPractice() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (difficulty) params.set('difficulty', difficulty);
    if (topic) params.set('topic', topic);
    if (status) params.set('status', status);
    return params.toString();
  }, [debouncedSearch, difficulty, topic, status, page]);

  const { data, loading, error, refetch } = useApiResource(`/problems?${query}`);
  const { data: filters } = useApiResource('/problems/meta/filters');
  const { data: stats } = useApiResource('/problems/stats/me');

  const problems = data?.problems ?? [];
  const pagination = data?.pagination;

  /** Any filter change restarts pagination, otherwise page 3 of a new filter is empty. */
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="page-coding-practice bg-background font-body text-on-surface min-h-dvh">

      <main className="min-h-dvh">
        <header className="w-full sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-outline-variant/60">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Practice lab</p>
            <h1 className="font-headline text-3xl font-black tracking-tight mt-1">Coding Practice</h1>
          </div>

          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container/20 rounded-full">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  bolt
                </span>
                <span className="text-secondary-fixed-dim font-bold text-sm">
                  {stats.streak.current} day streak
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full focus-within:ring-2 focus-within:ring-primary/20 w-full lg:w-80">
              <span className="material-symbols-outlined text-outline">search</span>
              <input
                value={search}
                onChange={(event) => withReset(setSearch)(event.target.value)}
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-outline"
                placeholder="Search problems or topics…"
                type="search"
              />
            </div>
          </div>
        </header>

        <div className="p-6 space-y-4">
          {stats && (
            <section className="bg-inverse-surface text-white p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
              <div className="relative z-10 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-headline mb-1">Your proficiency</h2>
                  <p className="text-neutral-400">
                    {stats.totalSolved} of {stats.totalAvailable} problems solved
                    {stats.streak.longest > 0 && ` • longest streak ${stats.streak.longest} days`}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 items-end lg:w-[26rem]">
                  <StatBar label="easy" solved={stats.solved.easy} total={stats.available.easy} color="bg-secondary-fixed" />
                  <StatBar label="medium" solved={stats.solved.medium} total={stats.available.medium} color="bg-tertiary-fixed" />
                  <StatBar label="hard" solved={stats.solved.hard} total={stats.available.hard} color="bg-primary-fixed" />
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={difficulty}
              onChange={(event) => withReset(setDifficulty)(event.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <select
              value={topic}
              onChange={(event) => withReset(setTopic)(event.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All topics</option>
              {(filters?.topics ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => withReset(setStatus)(event.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All problems</option>
              <option value="unsolved">Unsolved</option>
              <option value="solved">Solved</option>
            </select>

            {(difficulty || topic || status || search) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDifficulty('');
                  setTopic('');
                  setStatus('');
                  setPage(1);
                }}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading && <LoadingBlock label="Loading problems" />}
          {error && <ErrorBlock error={error} onRetry={refetch} />}

          {!loading && !error && problems.length === 0 && (
            <EmptyBlock
              icon="code_off"
              title="No problems match those filters"
              description="Try widening your search, or seed the database with `npm run seed`."
            />
          )}

          {problems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {problems.map((problem) => (
                <Link
                  key={problem._id}
                  to={`/coding-practice/${problem.slug}`}
                  className="group bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all border border-outline-variant/60 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                        DIFFICULTY_STYLES[problem.difficulty]
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                    <div className="flex items-center gap-1">
                      {problem.bookmarked && (
                        <span
                          className="material-symbols-outlined text-primary text-lg"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                          title="Bookmarked"
                        >
                          bookmark
                        </span>
                      )}
                      {problem.solved && (
                        <span
                          className="material-symbols-outlined text-green-600 text-lg"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                          title="Solved"
                        >
                          check_circle
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-on-surface group-hover:text-primary transition-colors mb-3">
                    {problem.title}
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {problem.topics.slice(0, 3).map((item) => (
                      <span
                        key={item}
                        className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded-2xl"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between text-xs font-bold text-on-surface-variant border-t border-outline-variant/60">
                    <span>{problem.acceptanceRate}% acceptance</span>
                    {problem.companies.length > 0 && (
                      <span className="truncate max-w-[10rem]" title={problem.companies.join(', ')}>
                        {problem.companies.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="px-6 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/20 font-bold text-sm disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-on-surface-variant">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((current) => current + 1)}
                className="px-6 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/20 font-bold text-sm disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
