import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { api } from '../lib/api.js';

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function TestRunner() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Start (or resume) the attempt once on mount.
  useEffect(() => {
    let cancelled = false;

    api
      .post(`/tests/${slug}/start`)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        setAnswers(
          Object.fromEntries(
            (data.answers ?? [])
              .filter((answer) => answer.selectedOption)
              .map((answer) => [String(answer.question), String(answer.selectedOption)]),
          ),
        );
      })
      .catch((caught) => !cancelled && setError(caught));

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !session) return;
      submittedRef.current = true;
      setSubmitting(true);

      try {
        const payload = Object.entries(answersRef.current).map(([question, selectedOption]) => ({
          question,
          selectedOption,
        }));
        const data = await api.post(`/tests/attempts/${session.attemptId}/submit`, {
          answers: payload,
        });
        setResult({ ...data, auto });
      } catch (caught) {
        setError(caught);
        submittedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [session],
  );

  // The countdown is derived from the server's deadline, and auto-submits at zero.
  useEffect(() => {
    if (!session?.expiresAt || result) return undefined;

    const deadline = new Date(session.expiresAt).getTime();
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) submit(true);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, result, submit]);

  // Persist answers periodically so a refresh or a dropped connection is safe.
  useEffect(() => {
    if (!session || result) return undefined;

    const timer = setTimeout(() => {
      const payload = Object.entries(answers).map(([question, selectedOption]) => ({
        question,
        selectedOption,
      }));
      if (payload.length) {
        api
          .patch(`/tests/attempts/${session.attemptId}/answers`, { answers: payload })
          .catch(() => {});
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [answers, session, result]);

  useEffect(() => {
    if (result || !session) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [result, session]);

  const questions = session?.questions ?? [];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (error && !session) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <div className="max-w-lg w-full">
          <ErrorBlock error={error} onRetry={() => navigate('/skill-test')} />
        </div>
      </div>
    );
  }

  if (!session) return <LoadingBlock label="Preparing your test" className="min-h-screen" />;

  if (result) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-container-lowest max-w-2xl w-full rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="bg-white p-6 text-center border-b border-outline-variant/60">
            <div
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${
                result.passed
                  ? 'bg-primary-container text-on-primary-container shadow-primary-container/20'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-5xl">
                {result.passed ? 'verified' : 'target'}
              </span>
            </div>
            <h2 className="text-4xl font-black text-on-surface mb-2 tracking-tight">
              {result.percentage}%
            </h2>
            <p className="text-on-surface-variant font-medium text-lg">
              {result.auto
                ? 'Time ran out, so your answers were submitted automatically.'
                : result.passed
                  ? 'Passed — the related skills are now verified on your profile.'
                  : 'Not passed this time. Review and try again.'}
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-outline-variant/10 bg-surface-container-lowest">
            {[
              ['Correct', `${result.correctCount}/${result.totalCount}`],
              ['Marks', `${result.score}/${result.maxScore}`],
              ['Time', formatClock(result.durationSeconds * 1000)],
            ].map(([label, value]) => (
              <div key={label} className="p-6 text-center">
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">
                  {label}
                </p>
                <p className="text-2xl font-bold text-on-surface">{value}</p>
              </div>
            ))}
          </div>

          <div className="p-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate(`/skill-test/review/${result.attemptId}`)}
              className="flex-1 py-4 bg-primary text-on-primary font-bold rounded-full hover:scale-[1.02] transition-transform"
            >
              Review answers
            </button>
            <button
              type="button"
              onClick={() => navigate('/skill-test')}
              className="flex-1 py-4 bg-surface-container text-on-surface font-bold rounded-full hover:bg-surface-container-high transition-colors"
            >
              Back to tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[index];
  const lowTime = remaining < 60_000;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-outline-variant/60">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {session.test.title}
            </p>
            <p className="text-sm font-bold text-on-surface">
              Question {index + 1} of {questions.length}
              <span className="text-on-surface-variant font-medium ml-2">
                • {answeredCount} answered
              </span>
            </p>
          </div>

          <div
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black tabular-nums ${
              lowTime ? 'bg-error-container/30 text-on-error-container animate-pulse' : 'bg-surface-container'
            }`}
            aria-live={lowTime ? 'assertive' : 'off'}
          >
            <span className="material-symbols-outlined text-lg">timer</span>
            {formatClock(remaining)}
          </div>
        </div>

        <div className="h-1 bg-surface-container">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        {question && (
          <>
            <div className="flex items-center gap-2 mb-3">
              {question.topic && (
                <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold text-on-surface-variant">
                  {question.topic}
                </span>
              )}
              <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold text-on-surface-variant">
                {question.marks} mark{question.marks === 1 ? '' : 's'}
              </span>
            </div>

            <h2 className="font-headline text-2xl md:text-3xl font-black tracking-tight mb-4 whitespace-pre-line">
              {question.prompt}
            </h2>

            <div className="space-y-3" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question._id] === option._id;

                return (
                  <button
                    key={option._id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [question._id]: option._id }))
                    }
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                      selected
                        ? 'border-primary bg-primary-container/15'
                        : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/50'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="font-medium text-on-surface pt-1">{option.text}</span>
                  </button>
                );
              })}
            </div>

            {answers[question._id] && (
              <button
                type="button"
                onClick={() =>
                  setAnswers((current) => {
                    const next = { ...current };
                    delete next[question._id];
                    return next;
                  })
                }
                className="mt-4 text-sm font-bold text-on-surface-variant hover:text-error transition-colors"
              >
                Clear answer
              </button>
            )}
          </>
        )}
      </main>

      <footer className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-outline-variant/60">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((current) => current - 1)}
            className="px-6 py-3 rounded-full font-bold text-sm bg-surface-container disabled:opacity-40 hover:bg-surface-container-high transition-colors"
          >
            Previous
          </button>

          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto hide-scrollbar max-w-md">
            {questions.map((item, itemIndex) => (
              <button
                key={item._id}
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-label={`Go to question ${itemIndex + 1}`}
                className={`w-8 h-8 shrink-0 rounded-lg text-xs font-bold transition-colors ${
                  itemIndex === index
                    ? 'bg-primary text-on-primary'
                    : answers[item._id]
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {itemIndex + 1}
              </button>
            ))}
          </div>

          {index === questions.length - 1 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                const unanswered = questions.length - answeredCount;
                const message = unanswered
                  ? `${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered. Submit anyway?`
                  : 'Submit your test?';
                if (window.confirm(message)) submit(false);
              }}
              className="px-8 py-3 rounded-full bg-primary text-on-primary font-bold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)] disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit test'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((current) => current + 1)}
              className="px-8 py-3 rounded-full bg-inverse-surface text-white font-bold text-sm"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
