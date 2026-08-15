import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorBlock } from '../components/StateBlocks.jsx';
import { api } from '../lib/api.js';

function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const LEVEL_COPY = {
  advanced: 'You clearly know this well.',
  intermediate: 'Solid working knowledge, with room above it.',
  beginner: 'The fundamentals need more time before this is interview-ready.',
};

/**
 * A timed skill assessment. Full screen deliberately: there is no navigation
 * to wander into while the clock is running.
 */
export default function SkillAttempt() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [session] = useState(location.state?.session ?? null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = useCallback(async () => {
    if (submittedRef.current || !session) return;
    submittedRef.current = true;

    try {
      setResult(
        await api.post(`/skills/attempts/${attemptId}/submit`, {
          answers: Object.entries(answersRef.current).map(([question, selectedOption]) => ({
            question,
            selectedOption,
          })),
        }),
      );
    } catch (caught) {
      setError(caught);
      submittedRef.current = false;
    }
  }, [attemptId, session]);

  // The deadline is the server's; this only mirrors it and auto-submits so an
  // unattended tab still records a result.
  useEffect(() => {
    if (!session || result) return undefined;

    const tick = () => {
      const left = new Date(session.expiresAt).getTime() - Date.now();
      setRemaining(left);
      if (left <= 0) submit();
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, result, submit]);

  if (!session) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="text-center">
          <p className="font-bold mb-2">That assessment session has expired.</p>
          <Link to="/skills" className="text-primary font-bold text-sm hover:underline">
            Back to skills
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <ErrorBlock error={error} onRetry={() => setError(null)} />
      </div>
    );
  }

  // --- Result -------------------------------------------------------------
  if (result) {
    return (
      <div className="min-h-dvh bg-background text-on-surface">
        <div className="max-w-2xl mx-auto px-5 py-10 space-y-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              {session.skill}
            </p>
            <p className="font-headline text-4xl font-black tracking-tight mt-2 tabular-nums">
              {result.score}/{result.total}
            </p>
            <p className="text-sm text-on-surface-variant mt-1">{result.percentage}%</p>

            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800">
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                verified
              </span>
              <span className="font-black text-sm capitalize">{result.level}</span>
            </div>

            <p className="text-sm text-on-surface-variant mt-3">{LEVEL_COPY[result.level]}</p>

            {result.verified && (
              <p className="text-xs text-green-700 font-bold mt-2">
                {session.skill} is now verified on your profile.
              </p>
            )}
            {result.expired && (
              <p className="text-xs text-error font-bold mt-2">
                Time ran out, so this was submitted automatically.
              </p>
            )}
          </div>

          <section className="space-y-2">
            {result.review.map((item, itemIndex) => (
              <article
                key={itemIndex}
                className={`bg-surface-container-lowest rounded-xl p-4 border-l-4 ${
                  item.isCorrect ? 'border-green-500' : 'border-error'
                }`}
              >
                <p className="font-bold text-sm mb-2">
                  {itemIndex + 1}. {item.prompt}
                </p>

                <ul className="space-y-1">
                  {item.options.map((option) => {
                    const chosen = String(option._id) === String(item.selectedOption);
                    return (
                      <li
                        key={option._id}
                        className={`px-3 py-2 rounded-lg text-xs flex justify-between gap-2 ${
                          option.isCorrect
                            ? 'bg-green-50 text-green-900 font-bold'
                            : chosen
                              ? 'bg-error-container/20 text-on-error-container'
                              : 'bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        <span>{option.text}</span>
                        <span className="text-[9px] font-black uppercase shrink-0">
                          {option.isCorrect ? 'correct' : chosen ? 'your answer' : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {item.explanation && (
                  <p className="text-xs text-on-surface-variant mt-2 p-3 bg-surface-container-low rounded-lg leading-relaxed">
                    {item.explanation}
                  </p>
                )}
              </article>
            ))}
          </section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/skills')}
              className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
            >
              Back to skills
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 rounded-lg bg-surface-container font-bold text-sm"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Running ------------------------------------------------------------
  const question = session.questions[index];
  const answered = Object.keys(answers).length;
  const low = remaining < 60_000;

  return (
    <div className="min-h-dvh bg-background text-on-surface flex flex-col">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-outline-variant/60">
        <div className="max-w-2xl mx-auto px-5 py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {session.skill}
              </p>
              <p className="text-sm font-bold mt-0.5">
                Question {index + 1} of {session.questions.length}
              </p>
            </div>
            <span
              className={`font-mono text-sm font-bold tabular-nums ${low ? 'text-error' : 'text-on-surface-variant'}`}
            >
              {clock(remaining)}
            </span>
          </div>

          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-300"
              style={{ width: `${(answered / session.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-6 space-y-4">
        <h1 className="font-headline text-lg md:text-xl font-bold leading-snug">
          {question.prompt}
        </h1>

        <ul className="space-y-2">
          {question.options.map((option) => {
            const selected = answers[question._id] === option._id;
            return (
              <li key={option._id}>
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [question._id]: option._id }))
                  }
                  aria-pressed={selected}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5 font-bold'
                      : 'border-outline-variant/60 bg-surface-container-lowest hover:border-outline-variant'
                  }`}
                >
                  {option.text}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((value) => value - 1)}
            className="px-5 py-2.5 rounded-lg bg-surface-container font-bold text-sm disabled:opacity-40"
          >
            Back
          </button>

          {index < session.questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((value) => value + 1)}
              className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
            >
              Submit assessment
            </button>
          )}
        </div>

        {/* Jumping between questions beats forcing a linear pass. */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {session.questions.map((item, itemIndex) => (
            <button
              key={item._id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`Go to question ${itemIndex + 1}`}
              aria-current={itemIndex === index}
              className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                itemIndex === index
                  ? 'bg-inverse-surface text-white'
                  : answers[item._id]
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {itemIndex + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
