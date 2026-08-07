import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import CompanyLogo from '../features/company/CompanyLogo.jsx';
import { DIFFICULTY_STYLES, STEP_COLORS, TIER_LABELS } from '../features/company/meta.js';

export default function CompanyHub() {
  const { slug } = useParams();
  const { data, loading, error, refetch } = useApiResource(`/companies/${slug}`);

  if (loading) return <LoadingBlock label="Loading prep hub" className="min-h-dvh" />;
  if (error) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { company, topQuestions } = data;

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-3">
        <div>
          <Link
            to="/company-prep"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Company prep
          </Link>
          <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">
            {company.name} Prep Hub
          </h1>
        </div>

        {/* Overview + mock CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <section
            className="lg:col-span-2 rounded-xl p-4 border"
            style={{
              background: `${company.brandColor}0d`,
              borderColor: `${company.brandColor}26`,
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-wider">
                {TIER_LABELS[company.tier]}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  DIFFICULTY_STYLES[company.difficulty]
                }`}
              >
                {company.difficulty} difficulty
              </span>
            </div>

            <div className="flex items-start gap-3">
              <CompanyLogo company={company} size={56} />
              <div className="min-w-0">
                <h2 className="font-headline text-xl font-bold">{company.tagline}</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
                  {company.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4">
              {company.focusAreas.map((area) => (
                <span
                  key={area}
                  className="text-[10px] px-2.5 py-1 bg-surface-container-lowest text-on-surface-variant font-bold rounded-2xl border border-outline-variant/15"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-xl p-4 bg-primary-container text-white flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-3xl">videocam</span>
              <h2 className="font-headline text-lg font-bold mt-3">Ready to speak?</h2>
              <p className="text-sm text-white/85 leading-relaxed mt-1.5">
                Run a mock round tuned to how {company.name} interviews, and get scored on it.
              </p>
            </div>
            <Link
              to={`/ai-interview?company=${encodeURIComponent(company.name)}`}
              className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-on-primary-container font-bold text-sm hover:scale-[1.02] transition-transform"
            >
              Start mock now
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </section>
        </div>

        {/* Journey + insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <section className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/15">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-headline text-base font-bold">The interview journey</h2>
              {company.processDuration && (
                <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                  Est. {company.processDuration}
                </span>
              )}
            </div>

            <ol className="space-y-4">
              {company.rounds.map((round, index) => (
                <li key={round.order} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        STEP_COLORS[index % STEP_COLORS.length]
                      }`}
                    >
                      {round.order}
                    </span>
                    {index < company.rounds.length - 1 && (
                      <span className="w-px flex-1 bg-outline-variant/30 mt-1" />
                    )}
                  </div>

                  <div className="pb-1 min-w-0">
                    <h3 className="font-bold text-sm">{round.name}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      {round.duration && (
                        <span className="font-bold text-on-surface">{round.duration}. </span>
                      )}
                      {round.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-tertiary-container/25 rounded-xl p-4 border border-tertiary-container/40">
            <h2 className="font-headline text-base font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-tertiary text-lg">lightbulb</span>
              Strategy
            </h2>

            <div className="space-y-3">
              {company.insights.map((insight, index) => (
                <blockquote
                  key={index}
                  className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/10"
                >
                  <p className="text-xs text-on-surface leading-relaxed">“{insight.quote}”</p>
                  <footer className="text-[10px] text-on-surface-variant font-bold mt-2">
                    {insight.author}
                    {insight.role && <span className="font-medium"> — {insight.role}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        </div>

        {/* Most asked */}
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="font-headline text-base font-bold">Most asked questions</h2>
            <Link
              to={`/pyq-library?company=${encodeURIComponent(company.name)}`}
              className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
            >
              View all
            </Link>
          </div>

          {topQuestions.length === 0 ? (
            <p className="text-sm text-on-surface-variant bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/15">
              No reported questions for {company.name} yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topQuestions.map((question) => (
                <article
                  key={question._id}
                  className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/15 flex flex-col"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {question.topics.slice(0, 1).map((topic) => (
                      <span
                        key={topic}
                        className="text-[9px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-black uppercase tracking-wider rounded-2xl"
                      >
                        {topic}
                      </span>
                    ))}
                    <span
                      className={`text-[9px] px-2 py-0.5 font-black uppercase tracking-wider rounded-2xl ${
                        DIFFICULTY_STYLES[question.difficulty]
                      }`}
                    >
                      {question.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm leading-snug flex-1">{question.title}</h3>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-outline-variant/10">
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      Asked {question.askedCount} times
                    </span>

                    {question.problem ? (
                      <Link
                        to={`/coding-practice/${question.problem.slug}`}
                        aria-label={`Practise ${question.title}`}
                        className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                      </Link>
                    ) : (
                      question.progress === 'solved' && (
                        <span
                          className="material-symbols-outlined text-green-600 text-base"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          check_circle
                        </span>
                      )
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
