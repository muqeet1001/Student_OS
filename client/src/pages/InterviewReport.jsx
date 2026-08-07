import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

const DIMENSION_LABELS = {
  structure: 'Structure',
  specificity: 'Specificity',
  coverage: 'Relevance',
  delivery: 'Delivery',
};

function toneFor(value) {
  if (value >= 75) return { bar: 'bg-green-500', text: 'text-green-700' };
  if (value >= 50) return { bar: 'bg-secondary-fixed-dim', text: 'text-on-secondary-container' };
  return { bar: 'bg-error', text: 'text-error' };
}

function DimensionBar({ label, value }) {
  const tone = toneFor(value);
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1.5">
        <span className="text-on-surface-variant">{label}</span>
        <span className={tone.text}>{value}%</span>
      </div>
      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${tone.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function InterviewReport() {
  const { sessionId } = useParams();
  const { data, loading, error, refetch } = useApiResource(`/interviews/${sessionId}`);

  const session = data?.session;

  if (loading) return <LoadingBlock label="Loading your report" className="min-h-dvh" />;
  if (error) {
    return (
      <div className="p-6 pt-20 lg:pt-8">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const tone = toneFor(session.overallScore);

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-4xl mx-auto px-5 md:px-8 pt-20 lg:pt-10 pb-16 space-y-6">
        <Link
          to="/ai-interview"
          className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-primary"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to interviews
        </Link>

        {/* Headline score */}
        <header className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary capitalize">
            {session.round.replace('-', ' ')} round
            {session.targetRole && ` • ${session.targetRole}`}
          </p>

          <div className="flex flex-wrap items-baseline gap-4 mt-3">
            <h1 className="font-headline text-4xl font-black tracking-tight">
              {session.overallScore}%
            </h1>
            <span className={`text-lg font-bold ${tone.text}`}>{session.verdict}</span>
          </div>

          <p className="text-on-surface-variant mt-3">
            {session.answers.filter((item) => !item.skipped).length} of {session.questionCount}{' '}
            questions answered
            {session.completedAt && ` • ${new Date(session.completedAt).toLocaleString()}`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-8">
            {Object.entries(session.dimensions ?? {}).map(([key, value]) => (
              <DimensionBar key={key} label={DIMENSION_LABELS[key] ?? key} value={value} />
            ))}
          </div>
        </header>

        {/* Coaching summary */}
        {session.summary?.length > 0 && (
          <section className="bg-tertiary-container/20 rounded-xl p-6 border border-tertiary-container/30">
            <h2 className="font-headline text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">tips_and_updates</span>
              What to work on
            </h2>
            <ul className="space-y-2">
              {session.summary.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-on-surface leading-relaxed">
                  <span className="material-symbols-outlined text-tertiary text-base shrink-0 mt-0.5">
                    arrow_right
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Per-question breakdown */}
        <section className="space-y-5">
          <h2 className="font-headline text-xl font-bold">Question by question</h2>

          {session.answers.map((item, index) => {
            const itemTone = toneFor(item.score);
            return (
              <article
                key={item.question?._id ?? index}
                className={`bg-surface-container-lowest rounded-xl p-6 border-l-4 ${
                  item.skipped ? 'border-outline-variant' : itemTone.bar.replace('bg-', 'border-')
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="font-bold text-on-surface">
                    {index + 1}. {item.question?.prompt}
                  </h3>
                  <span className={`shrink-0 text-lg font-black ${itemTone.text}`}>
                    {item.skipped ? '—' : `${item.score}%`}
                  </span>
                </div>

                {item.skipped ? (
                  <p className="text-sm text-on-surface-variant italic">Skipped.</p>
                ) : (
                  <>
                    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line bg-surface-container-low rounded-lg p-4">
                      {item.answer}
                    </p>

                    {item.feedback?.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {item.feedback.map((note, noteIndex) => (
                          <li
                            key={noteIndex}
                            className={`flex items-start gap-2.5 text-sm ${
                              note.positive ? 'text-green-800' : 'text-on-surface-variant'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${
                                note.positive ? 'text-green-600' : 'text-outline'
                              }`}
                              style={note.positive ? { fontVariationSettings: '"FILL" 1' } : undefined}
                            >
                              {note.positive ? 'check_circle' : 'trending_up'}
                            </span>
                            {note.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {item.question?.modelAnswer && (
                      <details className="mt-4">
                        <summary className="text-xs font-bold text-primary cursor-pointer list-none flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Show a strong sample answer
                        </summary>
                        <p className="mt-2 text-sm text-on-surface-variant leading-relaxed bg-tertiary-container/10 rounded-lg p-4">
                          {item.question.modelAnswer}
                        </p>
                      </details>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/ai-interview"
            className="px-8 py-3 rounded-full bg-primary text-on-primary font-bold shadow-lg shadow-primary/20"
          >
            Practise another round
          </Link>
        </div>
      </div>
    </div>
  );
}
