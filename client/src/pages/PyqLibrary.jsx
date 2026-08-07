import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { api } from '../lib/api.js';

const DIFFICULTY_STYLES = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-tertiary-container text-on-tertiary-container',
  hard: 'bg-error-container/30 text-on-error-container',
};

const ROUND_LABELS = {
  'online-assessment': 'Online Assessment',
  technical: 'Technical',
  'system-design': 'System Design',
  hr: 'HR',
  'group-discussion': 'Group Discussion',
  other: 'Other',
};

function QuestionDetail({ questionId, onProgressChange }) {
  const { data, loading, error, refetch } = useApiResource(`/questions/${questionId}`, {
    enabled: Boolean(questionId),
  });
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingBlock label="Loading question" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;
  if (!data) return null;

  const { question, progress } = data;

  async function setStatus(status) {
    setSaving(true);
    try {
      const result = await api.put(`/questions/${question._id}/progress`, {
        status: progress?.status === status ? null : status,
      });
      onProgressChange(question._id, result.progress?.status ?? null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold">
          {question.company} • {question.year}
        </span>
        <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold">
          {ROUND_LABELS[question.round]}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            DIFFICULTY_STYLES[question.difficulty]
          }`}
        >
          {question.difficulty}
        </span>
      </div>

      <div>
        <h3 className="font-headline text-xl font-black mb-3">Question</h3>
        <p className="text-on-surface leading-relaxed whitespace-pre-line">{question.body}</p>
      </div>

      {question.answer && (
        <details className="group bg-surface-container-low rounded-xl overflow-hidden">
          <summary className="cursor-pointer list-none p-4 font-bold text-sm flex items-center justify-between hover:bg-surface-container transition-colors">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">key</span>
              Show approach
            </span>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="px-4 pb-4 text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
            {question.answer}
          </div>
        </details>
      )}

      {question.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.topics.map((topic) => (
            <span
              key={topic}
              className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-on-surface-variant"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-outline-variant/10">
        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('solved')}
          className={`px-6 py-3 rounded-full font-bold text-sm transition-all disabled:opacity-60 ${
            progress?.status === 'solved'
              ? 'bg-green-600 text-white'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1">check_circle</span>
          {progress?.status === 'solved' ? 'Solved' : 'Mark solved'}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('revisit')}
          className={`px-6 py-3 rounded-full font-bold text-sm transition-all disabled:opacity-60 ${
            progress?.status === 'revisit'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1">bookmark_flag</span>
          Revisit later
        </button>

        {question.problem && (
          <Link
            to={`/coding-practice/${question.problem.slug}`}
            className="px-6 py-3 rounded-full bg-primary-container text-on-primary-container font-bold text-sm hover:scale-[1.02] transition-transform ml-auto"
          >
            Solve in editor
            <span className="material-symbols-outlined text-base align-middle ml-1">arrow_forward</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PyqLibrary() {
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [progressOverrides, setProgressOverrides] = useState({});

  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (company) params.set('company', company);
    if (topic) params.set('topic', topic);
    if (difficulty) params.set('difficulty', difficulty);
    if (status) params.set('status', status);
    return params.toString();
  }, [debouncedSearch, company, topic, difficulty, status, page]);

  const { data, loading, error, refetch } = useApiResource(`/questions?${query}`);
  const { data: filters } = useApiResource('/questions/meta/filters');

  const questions = data?.questions ?? [];
  const pagination = data?.pagination;

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const progressOf = (question) =>
    progressOverrides[question._id] !== undefined
      ? progressOverrides[question._id]
      : question.progress;

  async function toggleBookmark(question) {
    try {
      await api.post(`/questions/${question._id}/bookmark`);
      refetch({ quiet: true });
    } catch {
      // A failed bookmark is not worth interrupting the browsing flow.
    }
  }

  return (
    <div className="page-pyq-library bg-background text-on-background min-h-dvh">

      <main className="min-h-dvh">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Question bank</p>
            <h1 className="font-headline text-3xl font-black tracking-tight mt-1">PYQ Library</h1>
          </div>
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full focus-within:ring-2 focus-within:ring-primary/20 w-full lg:w-96">
            <span className="material-symbols-outlined text-outline">search</span>
            <input
              value={search}
              onChange={(event) => withReset(setSearch)(event.target.value)}
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-outline"
              placeholder="Search questions, companies or topics…"
              type="search"
            />
          </div>
        </header>

        <div className="px-8 py-8">
          <div className="grid grid-cols-12 gap-5">
            {/* Filters */}
            <aside className="col-span-12 lg:col-span-3 space-y-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_24px_48px_rgba(14,14,14,0.06)]">
                <h3 className="font-headline font-bold text-lg mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">filter_list</span>
                  Company Focus
                </h3>

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  <button
                    type="button"
                    onClick={() => withReset(setCompany)('')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-full font-bold text-sm transition-colors ${
                      company === ''
                        ? 'bg-primary-container text-on-primary-container'
                        : 'hover:bg-surface-container-low text-on-surface font-medium'
                    }`}
                  >
                    <span>All companies</span>
                  </button>

                  {(filters?.companies ?? []).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => withReset(setCompany)(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-sm transition-colors ${
                        company === item.name
                          ? 'bg-primary-container text-on-primary-container font-bold'
                          : 'hover:bg-surface-container-low text-on-surface font-medium'
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
                          company === item.name ? 'bg-on-primary-container/20' : 'bg-surface-container-high'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>

                <hr className="my-6 border-outline-variant/20" />

                <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-stone-400 mb-4">
                  Topic Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(filters?.topics ?? []).slice(0, 18).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => withReset(setTopic)(topic === item ? '' : item)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        topic === item
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <hr className="my-6 border-outline-variant/20" />

                <div className="space-y-3">
                  <select
                    value={difficulty}
                    onChange={(event) => withReset(setDifficulty)(event.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-bold cursor-pointer focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  <select
                    value={status}
                    onChange={(event) => withReset(setStatus)(event.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-bold cursor-pointer focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All questions</option>
                    <option value="unsolved">Unsolved</option>
                    <option value="solved">Solved</option>
                  </select>
                </div>
              </div>
            </aside>

            {/* Question list */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              {pagination && (
                <div className="bg-tertiary-container/30 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 border border-tertiary-container/20">
                  <div className="flex-1">
                    <h2 className="text-2xl font-headline font-extrabold text-on-tertiary-container mb-1">
                      Practice makes permanent.
                    </h2>
                    <p className="text-on-tertiary-container/80">
                      {pagination.total} question{pagination.total === 1 ? '' : 's'}
                      {company ? ` from ${company}` : ' across every company in the bank'}.
                    </p>
                  </div>
                </div>
              )}

              {loading && <LoadingBlock label="Loading questions" />}
              {error && <ErrorBlock error={error} onRetry={refetch} />}

              {!loading && !error && questions.length === 0 && (
                <EmptyBlock
                  icon="quiz"
                  title="No questions match those filters"
                  description="Try a different company or clear the filters. Run `npm run seed` to load the starter bank."
                />
              )}

              {questions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {questions.map((question) => {
                    const progress = progressOf(question);

                    return (
                      <article
                        key={question._id}
                        className={`bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group ${
                          progress === 'revisit' ? 'border-l-4 border-secondary-fixed' : ''
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4 gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                                {question.company} • {question.year} • {ROUND_LABELS[question.round]}
                              </p>
                              <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">
                                {question.title}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(question)}
                              aria-label={question.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
                              className="shrink-0 text-stone-300 hover:text-primary transition-colors"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={
                                  question.bookmarked ? { fontVariationSettings: '"FILL" 1' } : undefined
                                }
                              >
                                bookmark
                              </span>
                            </button>
                          </div>

                          <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                            {question.body}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-6">
                            {question.topics.slice(0, 2).map((item) => (
                              <span
                                key={item}
                                className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded-2xl"
                              >
                                {item}
                              </span>
                            ))}
                            <span
                              className={`text-[10px] px-2 py-0.5 font-bold rounded-2xl uppercase ${
                                DIFFICULTY_STYLES[question.difficulty]
                              }`}
                            >
                              {question.difficulty}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenId(question._id)}
                            className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-full text-sm font-bold active:scale-95 transition-transform"
                          >
                            View question
                          </button>
                          {progress === 'solved' && (
                            <span
                              className="px-4 bg-green-100 text-green-700 py-3 rounded-full text-sm font-bold flex items-center justify-center"
                              title="Solved"
                            >
                              <span
                                className="material-symbols-outlined text-lg"
                                style={{ fontVariationSettings: '"FILL" 1' }}
                              >
                                check_circle
                              </span>
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="px-6 py-2.5 rounded-full bg-white border border-outline-variant/10 font-bold text-sm shadow-sm disabled:opacity-40 hover:shadow-md transition-all"
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
                    className="px-6 py-2.5 rounded-full bg-white border border-outline-variant/10 font-bold text-sm shadow-sm disabled:opacity-40 hover:shadow-md transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="Interview question" size="lg">
        {openId && (
          <QuestionDetail
            questionId={openId}
            onProgressChange={(id, next) =>
              setProgressOverrides((current) => ({ ...current, [id]: next }))
            }
          />
        )}
      </Modal>
    </div>
  );
}
