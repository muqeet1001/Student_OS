import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import CompanyLogo from '../features/company/CompanyLogo.jsx';
import { DIFFICULTY_STYLES, TIER_LABELS } from '../features/company/meta.js';

export default function CompanyPrep() {
  const { data, loading, error, refetch } = useApiResource('/companies');
  const [tier, setTier] = useState('');

  const companies = data?.companies ?? [];
  const visible = tier ? companies.filter((company) => company.tier === tier) : companies;

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Company prep</p>
          <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">
            Prepare for a specific company
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Each hub lays out the real interview process, what that company weights, and the questions
            students report being asked most often.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'expert', label: TIER_LABELS.expert },
            { value: 'top', label: TIER_LABELS.top },
            { value: 'growth', label: TIER_LABELS.growth },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTier(option.value)}
              aria-pressed={tier === option.value}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                tier === option.value
                  ? 'bg-inverse-surface text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading && <LoadingBlock label="Loading companies" />}
        {error && <ErrorBlock error={error} onRetry={refetch} />}

        {!loading && !error && visible.length === 0 && (
          <EmptyBlock
            icon="apartment"
            title="No companies here yet"
            description="Run the seed script to populate the prep hubs."
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((company) => (
            <Link
              key={company.slug}
              to={`/company-prep/${company.slug}`}
              className="group bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60 hover:border-primary/40 transition-all hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <CompanyLogo company={company} />
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    DIFFICULTY_STYLES[company.difficulty]
                  }`}
                >
                  {company.difficulty}
                </span>
              </div>

              <h2 className="font-headline text-base font-bold">{company.name}</h2>
              <p className="text-xs text-primary font-bold mt-0.5">{company.tagline}</p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {company.focusAreas.slice(0, 3).map((area) => (
                  <span
                    key={area}
                    className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-bold rounded-2xl"
                  >
                    {area}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-outline-variant/60 text-xs text-on-surface-variant font-medium">
                <span>{company.roundCount} rounds</span>
                <span>{company.questionCount} questions</span>
                <span className="material-symbols-outlined text-primary text-base group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
