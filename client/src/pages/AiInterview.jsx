import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const ROUNDS = [
  {
    value: 'behavioural',
    label: 'Behavioural',
    icon: 'diversity_3',
    blurb: 'Teamwork, conflict and ownership stories, scored against the STAR structure.',
  },
  {
    value: 'technical',
    label: 'Technical',
    icon: 'terminal',
    blurb: 'Fundamentals you are expected to explain out loud, not code on a whiteboard.',
  },
  {
    value: 'system-design',
    label: 'System Design',
    icon: 'schema',
    blurb: 'Trade-offs, scaling and data modelling for open-ended design prompts.',
  },
  {
    value: 'hr',
    label: 'HR & Fit',
    icon: 'record_voice_over',
    blurb: 'Motivation, strengths and the questions that open or close every round.',
  },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Warm-up' },
  { value: 'medium', label: 'Standard' },
  { value: 'hard', label: 'Senior' },
];

function ScoreChip({ value }) {
  const tone =
    value >= 75
      ? 'bg-green-100 text-green-800'
      : value >= 50
        ? 'bg-secondary-container/60 text-on-secondary-container'
        : 'bg-error-container/25 text-on-error-container';

  return <span className={`px-3 py-1 rounded-full text-xs font-black ${tone}`}>{value}%</span>;
}

export default function AiInterview() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiResource('/interviews');

  const [round, setRound] = useState('behavioural');
  const [difficulty, setDifficulty] = useState('medium');
  const [role, setRole] = useState('');
  const [count, setCount] = useState(5);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const sessions = data?.sessions ?? [];
  const summary = data?.summary;
  const active = data?.activeSession;

  async function start() {
    setStarting(true);
    setStartError('');
    try {
      const result = await api.post('/interviews', {
        round,
        difficulty,
        targetRole: role.trim() || undefined,
        questionCount: count,
      });
      navigate(`/ai-interview/session/${result.session._id}`);
    } catch (caught) {
      setStartError(caught.message || 'Could not start the interview.');
      setStarting(false);
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-20 lg:pt-10 pb-16 space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Interview lab</p>
          <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">
            AI Mock Interview
          </h1>
        </header>

        {active && (
          <div className="rounded-xl bg-secondary-container/40 border border-secondary-fixed p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-on-secondary-container">You have an interview in progress</p>
              <p className="text-sm text-on-secondary-container/80">
                {active.answered} of {active.questionCount} questions answered.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/ai-interview/session/${active._id}`)}
              className="px-6 py-3 rounded-full bg-inverse-surface text-white font-bold text-sm shrink-0"
            >
              Resume interview
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Setup */}
          <section className="xl:col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 space-y-6">
            <div>
              <h2 className="font-headline text-xl font-bold mb-1">Set up your round</h2>
              <p className="text-sm text-on-surface-variant">
                Answers are scored on structure, specificity and how well they cover what the question
                actually asks.
              </p>
            </div>

            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wider text-outline mb-3">
                Round type
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROUNDS.map((item) => (
                  <label
                    key={item.value}
                    className={`cursor-pointer rounded-lg p-4 border-2 transition-all ${
                      round === item.value
                        ? 'border-primary bg-primary-container/10'
                        : 'border-transparent bg-surface-container hover:bg-surface-container-high'
                    }`}
                  >
                    <input
                      type="radio"
                      name="round"
                      value={item.value}
                      checked={round === item.value}
                      onChange={() => setRound(item.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3 mb-1.5">
                      <span
                        className={`material-symbols-outlined ${
                          round === item.value ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{item.blurb}</p>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="target-role"
                  className="block text-xs font-bold uppercase tracking-wider text-outline"
                >
                  Target role <span className="normal-case text-outline/70">(optional)</span>
                </label>
                <input
                  id="target-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Backend Engineer"
                  className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-4 py-3 text-sm font-medium placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="question-count"
                  className="block text-xs font-bold uppercase tracking-wider text-outline"
                >
                  Questions
                </label>
                <select
                  id="question-count"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-4 py-3 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-container"
                >
                  {[3, 5, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} questions
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wider text-outline mb-3">
                Difficulty
              </legend>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDifficulty(item.value)}
                    aria-pressed={difficulty === item.value}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
                      difficulty === item.value
                        ? 'bg-inverse-surface text-white'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {startError && (
              <p role="alert" className="text-sm font-bold text-error">
                {startError}
              </p>
            )}

            <button
              type="button"
              onClick={start}
              disabled={starting || Boolean(active)}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 disabled:hover:scale-100"
            >
              {starting ? 'Preparing questions…' : 'Start interview'}
            </button>
          </section>

          {/* Results */}
          <aside className="xl:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.16em] mb-5">
                Your results
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-primary-container p-5">
                  <p className="text-3xl font-black font-headline text-on-primary-container">
                    {summary?.averageScore ?? 0}%
                  </p>
                  <p className="text-sm font-bold text-on-primary-container/75 mt-1">Average</p>
                </div>
                <div className="rounded-lg bg-secondary-fixed p-5">
                  <p className="text-3xl font-black font-headline text-on-secondary-fixed">
                    {summary?.completed ?? 0}
                  </p>
                  <p className="text-sm font-bold text-on-secondary-fixed-variant mt-1">Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <h3 className="font-headline font-bold mb-4">Recent sessions</h3>

              {loading && <LoadingBlock label="Loading" />}
              {error && <ErrorBlock error={error} onRetry={refetch} />}

              {!loading && !error && sessions.length === 0 && (
                <EmptyBlock
                  icon="forum"
                  title="No interviews yet"
                  description="Your completed rounds and scores will appear here."
                />
              )}

              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => navigate(`/ai-interview/report/${session._id}`)}
                    className="w-full flex items-center justify-between gap-3 p-4 bg-surface-container-low rounded-lg text-left hover:bg-surface-container transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm capitalize truncate">
                        {session.round.replace('-', ' ')}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(session.completedAt).toLocaleDateString()} •{' '}
                        {session.questionCount} questions
                      </p>
                    </div>
                    <ScoreChip value={session.overallScore} />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
