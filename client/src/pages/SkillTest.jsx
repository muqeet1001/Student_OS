import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

// Icons are limited to glyphs already present in the bundled icon font.
const ICON_BY_DOMAIN = {
  aptitude: 'calculate',
  'cs-core': 'terminal',
  communication: 'record_voice_over',
};

// Legacy category fallback for papers whose subject has not been resolved.
const ICON_BY_CATEGORY = {
  aptitude: 'calculate',
  technical: 'terminal',
  communication: 'record_voice_over',
};

const LEVEL_CHIP = {
  foundation: 'bg-surface-container text-on-surface-variant',
  intermediate: 'bg-primary/10 text-primary',
  advanced: 'bg-tertiary-fixed text-on-tertiary-fixed',
};

function iconFor(test) {
  const domain = test.subject?.domain ?? ICON_BY_CATEGORY[test.category];
  return ICON_BY_DOMAIN[domain] ?? 'quiz';
}

/** Subject/domain facet lists with counts, derived from the served tests. */
function facets(tests) {
  const subjects = new Map();
  const domains = new Map();

  for (const test of tests) {
    if (test.subject) {
      const current = subjects.get(test.subject.id) ?? { ...test.subject, count: 0 };
      current.count += 1;
      subjects.set(test.subject.id, current);
    }
    const domain = test.subject?.domain ?? test.category;
    if (domain) domains.set(domain, (domains.get(domain) ?? 0) + 1);
  }

  return { subjects: [...subjects.values()], domains: [...domains.entries()].map(([id, count]) => ({ id, count })) };
}

function AttemptHistory() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiResource('/tests/attempts');

  if (loading) return <LoadingBlock label="Loading history" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const attempts = data?.attempts ?? [];

  if (!attempts.length) {
    return <EmptyBlock icon="history" title="No attempts yet" description="Your completed tests will appear here." />;
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt) => (
        <div
          key={attempt._id}
          className="flex items-center justify-between gap-3 p-4 bg-surface-container-low rounded-lg"
        >
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{attempt.test?.title ?? 'Test'}</p>
            <p className="text-xs text-on-surface-variant">
              {new Date(attempt.submittedAt).toLocaleString()}
              {attempt.status === 'expired' && ' • timed out'}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p
                className={`text-lg font-black ${attempt.passed ? 'text-green-700' : 'text-error'}`}
              >
                {attempt.percentage}%
              </p>
              <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                {attempt.score}/{attempt.maxScore} marks
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/skill-test/review/${attempt._id}`)}
              className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary-dim transition-colors"
              aria-label={`Review ${attempt.test?.title ?? 'test'} attempt`}
            >
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const DOMAIN_LABEL = { aptitude: 'Aptitude', 'cs-core': 'CS Core', communication: 'Communication' };

export default function SkillTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, loading, error, refetch } = useApiResource('/tests');
  const { data: history } = useApiResource('/tests/attempts');
  const [historyOpen, setHistoryOpen] = useState(false);

  const tests = useMemo(() => data?.tests ?? [], [data?.tests]);
  const summary = history?.summary;

  // Browse the library as courses: first by domain, then by subject. A
  // subject belongs to exactly one domain, so "Databases" can never surface
  // under "Aptitude". A ?subject= query param (used by the practice track)
  // preselects the subject and its domain.
  const { subjects, domains } = useMemo(() => facets(tests), [tests]);
  const [subjectId, setSubjectId] = useState(() => {
    const fromUrl = searchParams.get('subject');
    return fromUrl && fromUrl !== 'all' ? fromUrl : 'all';
  });
  const [domainId, setDomainId] = useState('all');

  const visibleSubjects = domainId === 'all' ? subjects : subjects.filter((subject) => subject.domain === domainId);
  const visibleTests = useMemo(() => {
    if (subjectId !== 'all') return tests.filter((test) => test.subject?.id === subjectId);
    if (domainId !== 'all') return tests.filter((test) => (test.subject?.domain ?? test.category) === domainId);
    return tests;
  }, [tests, subjectId, domainId]);

  // A subject deep-link (?subject=…) selects its domain once the catalogue
  // arrives, so the facet chips stay consistent.
  useEffect(() => {
    if (subjectId === 'all') return;
    const subject = subjects.find((item) => item.id === subjectId);
    if (subject && subject.domain !== domainId) setDomainId(subject.domain);
  }, [subjectId, subjects, domainId]);

  return (
    <div className="bg-background font-body text-on-surface min-h-dvh">

      <main className="min-h-dvh">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-outline-variant/20">
          <div className="flex flex-col gap-3 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Readiness lab</p>
              <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-2">
                Skill Test
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="h-11 px-5 rounded-full bg-surface-container-high text-on-surface font-bold hover:bg-surface-container-highest transition-colors"
            >
              View History
            </button>
          </div>
        </header>

        <section className="p-6 space-y-4 pb-28">
          {data?.activeAttempt && (
            <div className="rounded-xl bg-secondary-container/40 border border-secondary-fixed p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-on-secondary-container">
                  {data.activeAttempt.title} is still in progress
                </p>
                <p className="text-sm text-on-secondary-container/80">
                  It expires at {new Date(data.activeAttempt.expiresAt).toLocaleTimeString()}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/skill-test/${data.activeAttempt.slug}`)}
                className="px-6 py-3 rounded-full bg-inverse-surface text-white font-bold text-sm shrink-0"
              >
                Resume test
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            <article className="xl:col-span-8 rounded-xl bg-inverse-surface text-white p-6 overflow-hidden relative">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-[90px]" />
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-primary-container">
                  <span className="material-symbols-outlined text-base">bolt</span>
                  Timed and auto-scored
                </span>
                <h2 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-4">
                  Know exactly where your placement prep stands.
                </h2>
                <p className="text-inverse-on-surface text-sm leading-relaxed mt-4">
                  Each test is timed on the server and scored the moment you submit. Passing a test
                  marks the related skills as verified on your profile.
                </p>
              </div>
            </article>

            <aside className="xl:col-span-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.16em]">
                Your results
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary-container p-5">
                  <p className="text-3xl font-black font-headline text-on-primary-container">
                    {summary?.averagePercentage ?? 0}%
                  </p>
                  <p className="text-sm font-bold text-on-primary-container/75 mt-1">Average</p>
                </div>
                <div className="rounded-lg bg-secondary-fixed p-5">
                  <p className="text-3xl font-black font-headline text-on-secondary-fixed">
                    {summary?.taken ?? 0}
                  </p>
                  <p className="text-sm font-bold text-on-secondary-fixed-variant mt-1">Tests done</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-surface-container p-5">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Tests passed</span>
                  <span className="text-primary">
                    {summary?.passed ?? 0}/{summary?.taken ?? 0}
                  </span>
                </div>
                <div className="mt-4 h-3 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${summary?.taken ? Math.round((summary.passed / summary.taken) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </aside>
          </div>

          {loading && <LoadingBlock label="Loading tests" />}
          {error && <ErrorBlock error={error} onRetry={refetch} />}

          {!loading && !error && tests.length === 0 && (
            <EmptyBlock
              icon="quiz"
              title="No tests available yet"
              description="Run `npm run seed` to load the starter test bank."
            />
          )}

          {tests.length > 0 && (
            <>
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant mr-1">
                    Area
                  </span>
                  <button
                    type="button"
                    onClick={() => { setDomainId('all'); setSubjectId('all'); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black ${domainId === 'all' && subjectId === 'all' ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    All papers
                  </button>
                  {domains.map((domain) => {
                    const count = domain.id === 'all' ? tests.length : domain.count;
                    return (
                      <button
                        key={domain.id}
                        type="button"
                        onClick={() => { setDomainId(domain.id); setSubjectId('all'); }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-black ${domainId === domain.id && subjectId === 'all' ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      >
                        {DOMAIN_LABEL[domain.id] ?? domain.id}
                        <span className="opacity-60 ml-1">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant mr-1">
                    Course
                  </span>
                  {visibleSubjects.length === 0 && (
                    <span className="text-xs text-on-surface-variant">No courses in this area yet.</span>
                  )}
                  {visibleSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => { setSubjectId(subject.id); setDomainId(subject.domain); }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                        subjectId === subject.id
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {subject.label}
                      <span className="opacity-60 ml-1">{subject.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {visibleTests.length === 0 ? (
                <EmptyBlock
                  icon="filter_list"
                  title="No papers in this course yet"
                  description="Widen the filter — the full library is always one click away."
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {visibleTests.map((test) => (
                    <article
                      key={test._id}
                      className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-[0px_16px_32px_rgba(14,14,14,0.04)] flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-12 w-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">{iconFor(test)}</span>
                        </div>
                        {test.lastAttempt ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                              test.lastAttempt.passed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-error-container/30 text-on-error-container'
                            }`}
                          >
                            {test.lastAttempt.percentage}%
                          </span>
                        ) : (
                          <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-xs font-black text-on-tertiary-fixed uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>

                      <h2 className="font-headline text-2xl font-black mt-4">{test.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="rounded-full border border-outline-variant/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                          {test.subject?.label ?? 'Uncategorised'}
                        </span>
                        {test.level && (
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${LEVEL_CHIP[test.level] ?? LEVEL_CHIP.foundation}`}>
                            {test.levelLabel ?? test.level}
                          </span>
                        )}
                      </div>
                      <p className="text-on-surface-variant leading-7 mt-3 flex-1">{test.description}</p>

                      <div className="flex flex-wrap gap-3 mt-4 text-sm font-bold text-on-surface-variant">
                        <span className="rounded-full bg-surface-container px-3 py-2">
                          {test.questionCount} questions
                        </span>
                        <span className="rounded-full bg-surface-container px-3 py-2">
                          {test.durationMinutes} min
                        </span>
                        <span className="rounded-full bg-surface-container px-3 py-2">
                          pass {test.passPercentage}%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/skill-test/${test.slug}`)}
                        className="mt-4 w-full py-3 rounded-full bg-primary-container text-on-primary-container font-bold shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        {test.lastAttempt ? 'Retake test' : 'Start test'}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Test history" size="md">
        <AttemptHistory />
      </Modal>
    </div>
  );
}
