import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CodeEditor from '../features/coding/CodeEditor.jsx';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const DIFFICULTY_STYLES = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-tertiary-container text-on-tertiary-container',
  hard: 'bg-error-container/30 text-on-error-container',
};

const VERDICT_TONE = {
  accepted: { color: 'text-green-400', icon: 'check_circle' },
  wrong_answer: { color: 'text-red-400', icon: 'cancel' },
  runtime_error: { color: 'text-red-400', icon: 'bug_report' },
  compile_error: { color: 'text-amber-400', icon: 'warning' },
  timeout: { color: 'text-amber-400', icon: 'timer_off' },
  memory_exceeded: { color: 'text-amber-400', icon: 'memory' },
  internal_error: { color: 'text-red-400', icon: 'error' },
};

/** Draft code is kept per problem so switching away does not lose work. */
const draftKey = (slug) => `sos:draft:${slug}`;

function TestResult({ result, index }) {
  return (
    <div
      className={`p-4 rounded-lg border text-xs font-mono space-y-1.5 ${
        result.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
      }`}
    >
      <div className="flex items-center justify-between font-sans">
        <span className="font-bold text-white/80">
          {result.name || `Case ${index + 1}`}
          {result.hidden && <span className="ml-2 text-white/40 font-normal">(hidden)</span>}
        </span>
        <span className={`font-bold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
          {result.passed ? 'Passed' : 'Failed'}
          {typeof result.runtimeMs === 'number' && (
            <span className="text-white/30 font-normal ml-2">{result.runtimeMs} ms</span>
          )}
        </span>
      </div>

      {!result.hidden && (
        <>
          <p className="text-white/50 break-all">
            <span className="text-white/30">Input: </span>
            {result.input}
          </p>
          <p className="text-white/50 break-all">
            <span className="text-white/30">Expected: </span>
            {result.expected}
          </p>
          {!result.passed && result.received !== null && (
            <p className="text-red-300 break-all">
              <span className="text-white/30">Received: </span>
              {result.received}
            </p>
          )}
        </>
      )}

      {result.error && <p className="text-red-300 break-all">{result.error}</p>}
    </div>
  );
}

export default function ProblemWorkspace() {
  const { slug } = useParams();
  const { data, loading, error, refetch } = useApiResource(`/problems/${slug}`);

  const [code, setCode] = useState('');
  const [tab, setTab] = useState('description');
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(null); // 'run' | 'submit'
  const [bookmarked, setBookmarked] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [submissions, setSubmissions] = useState(null);

  const problem = data?.problem;

  // Seed the editor once the problem arrives: saved draft, then last
  // submission, then the starter template.
  useEffect(() => {
    if (!problem) return;
    const draft = window.localStorage.getItem(draftKey(problem.slug));
    setCode(draft ?? data.lastSubmission?.code ?? problem.starterCode ?? '');
    setBookmarked(Boolean(data.bookmarked));
    setSolved(Boolean(data.solved));
    setReport(null);
    setHintIndex(-1);
  }, [problem, data]);

  useEffect(() => {
    if (!problem || !code) return undefined;
    const timer = setTimeout(() => {
      window.localStorage.setItem(draftKey(problem.slug), code);
    }, 800);
    return () => clearTimeout(timer);
  }, [code, problem]);

  const visibleResults = useMemo(() => report?.results ?? [], [report]);

  async function execute(mode) {
    if (!code.trim() || running) return;
    setRunning(mode);
    setReport(null);

    try {
      const result = await api.post(`/problems/${slug}/${mode}`, { code });
      setReport(result);
      if (mode === 'submit' && result.status === 'accepted') {
        setSolved(true);
        setSubmissions(null);
      }
    } catch (caught) {
      setReport({
        status: 'internal_error',
        verdictLabel: 'Judge Error',
        message: caught.message,
        results: [],
        logs: [],
      });
    } finally {
      setRunning(null);
    }
  }

  async function toggleBookmark() {
    const previous = bookmarked;
    setBookmarked(!previous);
    try {
      const result = await api.post(`/problems/${slug}/bookmark`);
      setBookmarked(result.bookmarked);
    } catch {
      setBookmarked(previous);
    }
  }

  async function loadSubmissions() {
    setTab('submissions');
    if (submissions) return;
    try {
      const result = await api.get(`/problems/${slug}/submissions`);
      setSubmissions(result.submissions);
    } catch {
      setSubmissions([]);
    }
  }

  if (loading) {
    return (
      <div className="bg-background min-h-dvh">
        <main>
          <LoadingBlock label="Loading problem" />
        </main>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="bg-background min-h-dvh">
        <main className="p-6">
          <ErrorBlock error={error} onRetry={refetch} />
        </main>
      </div>
    );
  }

  const tone = report ? VERDICT_TONE[report.status] ?? VERDICT_TONE.internal_error : null;

  return (
    <div className="bg-background font-body text-on-surface">

      <main className="min-h-dvh flex flex-col">
        <div className="flex-1 p-6 flex flex-col gap-3">
          {/* Problem header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to="/coding-practice"
                  className="text-sm font-bold text-on-surface-variant hover:text-primary flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  All problems
                </Link>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase font-headline ${
                    DIFFICULTY_STYLES[problem.difficulty]
                  }`}
                >
                  {problem.difficulty}
                </span>
                {solved && (
                  <span className="flex items-center gap-1 text-green-700 text-xs font-bold">
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      check_circle
                    </span>
                    Solved
                  </span>
                )}
                {problem.companies.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-sm">apartment</span>
                    {problem.companies.join(', ')}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black font-headline text-on-surface tracking-tight truncate">
                {problem.title}
              </h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {problem.hints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHintIndex((i) => Math.min(i + 1, problem.hints.length - 1))}
                  className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-full transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  <span>
                    Hint {hintIndex + 1 > 0 ? `${hintIndex + 1}/${problem.hints.length}` : ''}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleBookmark}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-full transition-transform active:scale-95"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={bookmarked ? { fontVariationSettings: '"FILL" 1' } : undefined}
                >
                  bookmark
                </span>
                <span>{bookmarked ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
            {/* Description panel */}
            <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden max-h-[calc(100vh-13rem)]">
              <div className="p-1 flex border-b border-surface-container">
                {[
                  ['description', 'Description'],
                  ['submissions', 'Submissions'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => (key === 'submissions' ? loadSubmissions() : setTab(key))}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${
                      tab === key
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                {tab === 'description' && (
                  <>
                    <p className="text-on-surface leading-relaxed font-medium whitespace-pre-line">
                      {problem.statement}
                    </p>

                    {problem.examples.map((example, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="font-headline font-extrabold text-sm uppercase tracking-wider">
                          Example {index + 1}
                        </h4>
                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 font-mono text-sm space-y-2">
                          <p>
                            <span className="text-outline">Input: </span>
                            {example.input}
                          </p>
                          <p>
                            <span className="text-outline">Output: </span>
                            {example.output}
                          </p>
                          {example.explanation && (
                            <p className="text-on-surface-variant">
                              <span className="text-outline">Explanation: </span>
                              {example.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {problem.constraints.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-headline font-extrabold text-sm uppercase tracking-wider">
                          Constraints
                        </h4>
                        <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1 font-medium">
                          {problem.constraints.map((constraint) => (
                            <li key={constraint} className="font-mono text-xs">
                              {constraint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hintIndex >= 0 &&
                      problem.hints.slice(0, hintIndex + 1).map((hint, index) => (
                        <div
                          key={hint}
                          className="p-4 bg-secondary-container/20 rounded-xl border-l-4 border-secondary"
                        >
                          <p className="text-xs font-bold text-on-secondary-container leading-relaxed">
                            <span className="material-symbols-outlined align-middle mr-1 text-sm">
                              lightbulb
                            </span>
                            Hint {index + 1}: {hint}
                          </p>
                        </div>
                      ))}

                    {problem.followUp && (
                      <div className="p-4 bg-tertiary-container/10 rounded-xl border-l-4 border-tertiary">
                        <p className="text-xs text-tertiary-dim font-bold leading-relaxed">
                          <span className="material-symbols-outlined align-middle mr-1 text-sm">info</span>
                          Follow up: {problem.followUp}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {tab === 'submissions' && (
                  <div className="space-y-3">
                    {submissions === null && <LoadingBlock label="Loading" className="py-5" />}
                    {submissions?.length === 0 && (
                      <p className="text-sm text-on-surface-variant text-center py-5">
                        No submissions yet.
                      </p>
                    )}
                    {submissions?.map((submission) => (
                      <div
                        key={submission._id}
                        className="p-4 bg-surface-container-low rounded-lg flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p
                            className={`font-bold text-sm ${
                              submission.verdict === 'accepted' ? 'text-green-700' : 'text-error'
                            }`}
                          >
                            {submission.verdictLabel}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {new Date(submission.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-on-surface">
                            {submission.passedCount}/{submission.totalCount} cases
                          </p>
                          <button
                            type="button"
                            onClick={() => setCode(submission.code)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Load code
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Editor panel */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 min-h-0">
              <div className="flex-1 code-editor-gradient rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col border border-white/5 min-h-[24rem]">
                <div className="h-12 bg-white/5 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs font-bold">
                      JavaScript
                    </span>
                    <span className="text-white/40 text-xs font-mono">
                      function {problem.functionName}(…)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset your code to the starter template?')) {
                        setCode(problem.starterCode || '');
                        window.localStorage.removeItem(draftKey(problem.slug));
                      }
                    }}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    Reset
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <CodeEditor value={code} onChange={setCode} />
                </div>

                <div className="bg-black/50 border-t border-white/10 shrink-0">
                  <div className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {tone && (
                        <span className={`flex items-center gap-2 text-xs font-bold ${tone.color}`}>
                          <span
                            className="material-symbols-outlined text-base"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            {tone.icon}
                          </span>
                          {report.verdictLabel}
                          {report.totalCount != null && (
                            <span className="text-white/40 font-normal">
                              {report.passedCount}/{report.totalCount} cases
                            </span>
                          )}
                          {report.engine && (
                            <span className="text-white/35 font-normal">via {report.engine}</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => execute('run')}
                        disabled={Boolean(running)}
                        className="px-6 py-2 bg-white/10 text-white font-bold rounded-lg text-sm hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {running === 'run' ? 'Running…' : 'Run Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => execute('submit')}
                        disabled={Boolean(running)}
                        className="px-8 py-2 bg-primary-container text-on-primary-container font-black rounded-lg text-sm hover:shadow-[0_0_20px_rgba(255,120,78,0.3)] transition-all active:scale-95 disabled:opacity-50"
                      >
                        {running === 'submit' ? 'Judging…' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console / results */}
              <div className="bg-[#0e0e0e] rounded-xl p-4 max-h-72 overflow-y-auto custom-scrollbar">
                {!report && (
                  <p className="text-white/30 text-xs font-mono">
                    Run your code to see results against the sample cases.
                  </p>
                )}

                {report?.message && (
                  <p className={`text-xs font-mono mb-3 ${tone?.color ?? 'text-white/60'}`}>
                    {report.message}
                  </p>
                )}

                {report?.logs?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2">
                      Console
                    </p>
                    <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap">
                      {report.logs.map((log) => log.line).join('\n')}
                    </pre>
                  </div>
                )}

                {visibleResults.length > 0 && (
                  <div className="space-y-2">
                    {visibleResults.map((result, index) => (
                      <TestResult key={index} result={result} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
