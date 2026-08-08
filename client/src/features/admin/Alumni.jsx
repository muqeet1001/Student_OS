import React from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';

function formatCtc(value) {
  if (!value) return '—';
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  return `₹${(value / 100_000).toFixed(1)} LPA`;
}

function Delta({ value, suffix = '' }) {
  if (value === 0) return <span className="text-on-surface-variant">no change</span>;

  return (
    <span className={value > 0 ? 'text-green-700' : 'text-on-error-container'}>
      {value > 0 ? '+' : ''}
      {suffix === 'LPA' ? `${(value / 100_000).toFixed(1)} LPA` : `${value}${suffix}`}
    </span>
  );
}

/** Placement history by graduating batch, and the year-on-year change. */
export default function Alumni() {
  const { data, loading, error, refetch } = useApiResource('/offers/alumni');

  if (loading && !data) return <LoadingBlock label="Loading placement history" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { years, trend, trendNote, totals } = data;

  if (years.length === 0) {
    return (
      <EmptyBlock
        icon="history"
        title="No placement history yet"
        description="Batches appear here once students have a graduation year on their profile."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { value: totals.batches, label: 'Batches' },
          { value: totals.completedBatches, label: 'Completed' },
          { value: totals.alumniPlaced, label: 'Alumni placed' },
          {
            value: trend ? <Delta value={trend.placementRateChange} suffix="%" /> : '—',
            label: 'Year on year',
            sub: trend ? `${trend.from} → ${trend.to}` : 'not comparable yet',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4"
          >
            <p className="text-2xl font-black font-headline tabular-nums leading-none">
              {stat.value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1.5">
              {stat.label}
            </p>
            {stat.sub && <p className="text-[10px] text-outline mt-0.5">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/*
        Stated rather than left to be inferred: a batch still being placed
        always looks worse than a finished one, and comparing them
        manufactures a "placements are down" headline out of the calendar.
      */}
      {trendNote && (
        <p className="bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface-variant">
          {trendNote}
        </p>
      )}

      {trend && (
        <p className="text-xs text-on-surface-variant">
          Between {trend.from} and {trend.to}, the placement rate moved{' '}
          <Delta value={trend.placementRateChange} suffix="%" /> and the median package moved{' '}
          <Delta value={trend.medianChange} suffix="LPA" />.
        </p>
      )}

      <div className="space-y-3">
        {years.map((year) => (
          <section
            key={year.graduationYear}
            className={`bg-surface-container-lowest rounded-xl border p-5 ${
              year.inProgress ? 'border-dashed border-outline-variant' : 'border-outline-variant/60'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <h3 className="font-headline text-lg font-black">Class of {year.graduationYear}</h3>
              {year.inProgress && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl bg-secondary-container text-on-secondary-container">
                  Season in progress
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { value: `${year.placementRate}%`, label: 'Placed', sub: `${year.placed} of ${year.students}` },
                { value: year.offers, label: 'Offers' },
                { value: formatCtc(year.salary.median), label: 'Median' },
                { value: formatCtc(year.salary.highest), label: 'Highest' },
                {
                  value: year.salary.reported,
                  label: 'Packages reported',
                  sub: year.salary.reported < year.placed ? 'some not disclosed' : undefined,
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-black tabular-nums leading-none">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline mt-1">
                    {stat.label}
                  </p>
                  {stat.sub && <p className="text-[10px] text-outline">{stat.sub}</p>}
                </div>
              ))}
            </div>

            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full ${year.inProgress ? 'bg-outline-variant' : 'bg-green-600'}`}
                style={{ width: `${year.placementRate}%` }}
              />
            </div>

            {year.topRecruiters.length > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  Top recruiters
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {year.topRecruiters.map((recruiter) => (
                    <li
                      key={recruiter.company}
                      className="text-xs bg-surface-container-low rounded-2xl px-2.5 py-1"
                    >
                      <span className="font-bold">{recruiter.company}</span>
                      <span className="text-on-surface-variant"> · {recruiter.hired}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
