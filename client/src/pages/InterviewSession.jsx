import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useSpeechInput } from '../hooks/useSpeechInput.js';
import { api } from '../lib/api.js';

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const textareaRef = useRef(null);

  const question = session?.currentQuestion;
  const questionId = question?._id;

  // Dictation appends to whatever has been typed so far.
  const speech = useSpeechInput({
    onCommit: (text) =>
      setAnswer((current) => (current ? `${current.trimEnd()} ${text.trim()}` : text.trim())),
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/interviews/${sessionId}`)
      .then((data) => {
        if (cancelled) return;
        if (data.session.status === 'completed') {
          navigate(`/ai-interview/report/${sessionId}`, { replace: true });
          return;
        }
        setSession(data.session);
      })
      .catch((caught) => !cancelled && setError(caught));

    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  // Per-question timer. Resetting on question id also clears any draft.
  useEffect(() => {
    if (!questionId) return undefined;
    setElapsed(0);
    setAnswer('');
    textareaRef.current?.focus();
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [questionId]);

  const wordCount = useMemo(
    () => answer.trim().split(/\s+/).filter(Boolean).length,
    [answer],
  );

  const submitAnswer = useCallback(
    async (skipped = false) => {
      if (submitting || !question) return;
      if (speech.listening) speech.stop();

      setSubmitting(true);
      try {
        const result = await api.post(`/interviews/${sessionId}/answer`, {
          questionId: question._id,
          answer: skipped ? '' : answer,
          secondsTaken: elapsed,
          skipped,
        });

        if (result.session.status === 'completed') {
          navigate(`/ai-interview/report/${sessionId}`, { replace: true });
          return;
        }
        setSession(result.session);
      } catch (caught) {
        setError(caught);
      } finally {
        setSubmitting(false);
      }
    },
    [answer, elapsed, navigate, question, sessionId, speech, submitting],
  );

  async function endEarly() {
    if (!window.confirm('End the interview now? Unanswered questions will score zero.')) return;
    setFinishing(true);
    try {
      await api.post(`/interviews/${sessionId}/complete`);
      navigate(`/ai-interview/report/${sessionId}`, { replace: true });
    } catch (caught) {
      setError(caught);
      setFinishing(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background p-6 grid place-items-center">
        <ErrorBlock error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!session) return <LoadingBlock label="Preparing your interview" className="min-h-dvh" />;

  const answered = session.progress.answered;
  const total = session.progress.total;
  const pct = Math.round((answered / total) * 100);

  return (
    <div className="min-h-dvh bg-background text-on-surface flex flex-col">
      {/* Progress header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-outline-variant/20">
        <div className="max-w-4xl mx-auto px-5 md:px-6 py-3">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary capitalize">
                {session.round.replace('-', ' ')} round
              </p>
              <p className="text-sm font-bold mt-0.5">
                Question {answered + 1} of {total}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-sm font-bold text-on-surface-variant tabular-nums">
                {formatClock(elapsed)}
              </span>
              <button
                type="button"
                onClick={endEarly}
                disabled={finishing}
                className="px-4 py-2 rounded-full text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-60"
              >
                End
              </button>
            </div>
          </div>

          <div
            className="h-2 w-full bg-surface-container rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 md:px-8 py-8 md:py-8 space-y-6">
        {/* Interviewer */}
        <div className="flex gap-4">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-inverse-surface text-white flex items-center justify-center">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div className="flex-1 min-w-0 bg-surface-container-lowest rounded-xl rounded-tl-sm p-6 border border-outline-variant/10">
            <h1 className="font-headline text-xl md:text-2xl font-bold leading-snug">
              {question.prompt}
            </h1>

            {question.hint && (
              <details className="mt-4 group">
                <summary className="text-xs font-bold text-primary cursor-pointer list-none flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  What a strong answer covers
                </summary>
                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{question.hint}</p>
              </details>
            )}
          </div>
        </div>

        {/* Answer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="answer" className="text-xs font-bold uppercase tracking-wider text-outline">
              Your answer
            </label>

            {speech.supported && (
              <button
                type="button"
                onClick={speech.toggle}
                aria-pressed={speech.listening}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                  speech.listening
                    ? 'bg-error text-on-error'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {speech.listening ? 'stop_circle' : 'mic'}
                </span>
                {speech.listening ? 'Stop dictation' : 'Dictate'}
              </button>
            )}
          </div>

          <textarea
            id="answer"
            ref={textareaRef}
            value={answer + (speech.interim ? ` ${speech.interim}` : '')}
            onChange={(event) => setAnswer(event.target.value)}
            rows={10}
            placeholder="Speak or type your answer as you would in a real interview…"
            className="w-full bg-surface-container-lowest border-2 border-transparent rounded-xl px-5 py-4 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-container"
          />

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-on-surface-variant font-medium">
              {wordCount} words
              {wordCount > 0 && wordCount < 40 && ' • aim for 60–150 on a full answer'}
            </span>
            {speech.error && <span className="text-error font-bold">{speech.error}</span>}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => submitAnswer(true)}
            disabled={submitting}
            className="px-6 py-3 rounded-full font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-60"
          >
            Skip this question
          </button>

          <button
            type="button"
            onClick={() => submitAnswer(false)}
            disabled={submitting || !answer.trim()}
            className="flex-1 px-8 py-3 rounded-full bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60 disabled:hover:scale-100"
          >
            {submitting
              ? 'Scoring…'
              : answered + 1 === total
                ? 'Submit and finish'
                : 'Submit and continue'}
          </button>
        </div>
      </main>
    </div>
  );
}
