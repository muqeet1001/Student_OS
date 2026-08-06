import React from 'react';
import { Link, useParams } from 'react-router-dom';
import SideNavBar from '../components/SideNavBar.jsx';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

export default function TestReview() {
  const { attemptId } = useParams();
  const { data, loading, error, refetch } = useApiResource(`/tests/attempts/${attemptId}`);

  const attempt = data?.attempt;

  return (
    <div className="page-export bg-background min-h-screen text-on-surface">
      <SideNavBar />

      <main className="ml-72 min-h-screen p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <Link
            to="/skill-test"
            className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to tests
          </Link>

          {loading && <LoadingBlock label="Loading review" />}
          {error && <ErrorBlock error={error} onRetry={refetch} />}

          {attempt && (
            <>
              <header className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  {attempt.test?.title}
                </p>
                <div className="flex flex-wrap items-baseline gap-4 mt-3">
                  <h1 className="font-headline text-5xl font-black tracking-tight">
                    {attempt.percentage}%
                  </h1>
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      attempt.passed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-error-container/30 text-on-error-container'
                    }`}
                  >
                    {attempt.passed ? 'Passed' : 'Not passed'}
                  </span>
                </div>
                <p className="text-on-surface-variant mt-3">
                  {attempt.score} of {attempt.maxScore} marks
                  {attempt.status === 'expired' && ' • submitted automatically when time ran out'}
                </p>
              </header>

              <div className="space-y-5">
                {attempt.review.map((item, index) => (
                  <article
                    key={index}
                    className={`bg-surface-container-lowest rounded-xl p-6 border-l-4 ${
                      item.isCorrect ? 'border-green-500' : 'border-error'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h2 className="font-bold text-on-surface whitespace-pre-line">
                        {index + 1}. {item.prompt}
                      </h2>
                      <span
                        className={`shrink-0 material-symbols-outlined ${
                          item.isCorrect ? 'text-green-600' : 'text-error'
                        }`}
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        {item.isCorrect ? 'check_circle' : 'cancel'}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {item.options.map((option) => {
                        const chosen = String(option._id) === String(item.selectedOption);

                        return (
                          <li
                            key={option._id}
                            className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between gap-3 ${
                              option.isCorrect
                                ? 'bg-green-50 text-green-900'
                                : chosen
                                  ? 'bg-error-container/15 text-on-error-container'
                                  : 'bg-surface-container-low text-on-surface-variant'
                            }`}
                          >
                            <span>{option.text}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest shrink-0">
                              {option.isCorrect ? 'Correct' : chosen ? 'Your answer' : ''}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {item.explanation && (
                      <p className="mt-4 p-4 bg-tertiary-container/15 rounded-lg text-sm text-on-surface-variant leading-relaxed">
                        <span className="font-bold text-on-surface">Why: </span>
                        {item.explanation}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
