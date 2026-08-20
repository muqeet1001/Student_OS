import React from 'react';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import PlacementInsight from './PlacementInsight.jsx';

const PRIORITY_TONES = {
  high: 'bg-error-container/25 text-on-error-container',
  medium: 'bg-secondary-container text-on-secondary-container',
  low: 'bg-surface-container text-on-surface-variant',
};

function Metric({ value, label, sub }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
      <p className="text-2xl font-black font-headline tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1.5">
        {label}
      </p>
      {sub && <p className="text-[10px] text-outline mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * Cohort-level analysis.
 *
 * Structured around the decision an officer actually has to make — which
 * training to run — rather than around the data that happens to exist.
 */
export default function Insights({ graduationYear = '' }) {
  const suffix = graduationYear ? `?graduationYear=${graduationYear}` : '';
  const { data, loading, error, refetch } = useApiResource(`/admin/analytics${suffix}`);

  if (loading && !data) return <LoadingBlock label="Analysing cohort" />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const { totals, bands, skills, departments, recommendations } = data;

  if (totals.students === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        No students registered yet. Analytics appear once the cohort exists.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric value={totals.students} label="Students" />
        <Metric value={`${totals.averageReadiness}%`} label="Average readiness" />
        <Metric
          value={totals.ready}
          label="Placement ready"
          sub={`${Math.round((totals.ready / totals.students) * 100)}% of cohort`}
        />
        <Metric
          value={totals.atRisk}
          label="At risk"
          sub={`${Math.round((totals.atRisk / totals.students) * 100)}% of cohort`}
        />
      </div>

      {/* What to run — the actionable half of the page. */}
      <PlacementInsight graduationYear={graduationYear} />

      {recommendations.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
            Training this cohort needs
          </h2>

          <ul className="space-y-2">
            {recommendations.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low"
              >
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-2xl shrink-0 mt-0.5 ${
                    PRIORITY_TONES[item.priority]
                  }`}
                >
                  {item.priority}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{item.reason}</p>
                  <p className="text-xs text-outline mt-1 italic">{item.action}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-black tabular-nums leading-none">{item.affected}</p>
                  <p className="text-[9px] uppercase tracking-wider text-on-surface-variant">
                    students
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Skill coverage */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
            Skill coverage
          </h2>

          <ul className="space-y-2.5">
            {skills.slice(0, 10).map((item) => (
              <li key={item.skill}>
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="font-bold truncate">{item.skill}</span>
                  <span className="text-on-surface-variant tabular-nums shrink-0">
                    <span className="text-green-700 font-bold">{item.verified}</span> verified
                    {item.unproven > 0 && ` · ${item.unproven} unproven`}
                  </span>
                </div>

                {/* Verified and unproven are stacked so the gap between what
                    students claim and what they have proved is visible. */}
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-600"
                    style={{ width: `${item.verifiedPercentage}%` }}
                    title={`${item.verified} verified`}
                  />
                  <div
                    className="h-full bg-secondary-fixed-dim"
                    style={{ width: `${item.coveragePercentage - item.verifiedPercentage}%` }}
                    title={`${item.unproven} claimed but unproven`}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[10px] text-outline mt-3">
            Green is verified by assessment; amber is claimed but never tested.
          </p>
        </section>

        <div className="space-y-4">
          {/* Readiness distribution */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
              Readiness distribution
            </h2>

            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              {bands.map((band) => (
                <div
                  key={band.key}
                  className={
                    band.key === 'ready'
                      ? 'bg-green-600'
                      : band.key === 'progressing'
                        ? 'bg-secondary-fixed-dim'
                        : 'bg-error'
                  }
                  style={{ width: `${band.percentage}%` }}
                  title={`${band.label}: ${band.count}`}
                />
              ))}
            </div>

            <ul className="space-y-1">
              {bands.map((band) => (
                <li key={band.key} className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">{band.label}</span>
                  <span className="font-bold tabular-nums">
                    {band.count} ({band.percentage}%)
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Departments */}
          {departments.length > 1 && (
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
                By department
              </h2>

              <ul className="space-y-2">
                {departments.map((dept) => (
                  <li key={dept.branch}>
                    <div className="flex justify-between items-baseline text-xs mb-1">
                      <span className="font-bold truncate">{dept.branch}</span>
                      <span className="text-on-surface-variant tabular-nums shrink-0">
                        {dept.averageReadiness}% · {dept.students} students
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-on-surface/30 rounded-full"
                        style={{ width: `${dept.averageReadiness}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
