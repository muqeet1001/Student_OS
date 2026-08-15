import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const STAGES = [
  { key: 'saved', label: 'Saved', accent: 'bg-on-surface/20' },
  { key: 'applied', label: 'Applied', accent: 'bg-tertiary' },
  { key: 'assessment', label: 'Assessment', accent: 'bg-secondary' },
  { key: 'interview', label: 'Interview', accent: 'bg-primary' },
  { key: 'offer', label: 'Offer', accent: 'bg-green-600' },
  { key: 'rejected', label: 'Rejected', accent: 'bg-outline-variant' },
];

const ORDER = STAGES.map((stage) => stage.key);

function Card({ item, onMove, onRemove, busy }) {
  const stageIndex = ORDER.indexOf(item.stage);
  const next = ORDER[stageIndex + 1];
  const previous = ORDER[stageIndex - 1];

  return (
    <li className="bg-surface-container-lowest rounded-lg border border-outline-variant/60 p-3 group">
      <Link to={`/jobs/${item.job?._id}`} className="block min-w-0">
        <p className="text-sm font-bold leading-snug truncate">{item.job?.title}</p>
        <p className="text-xs text-on-surface-variant truncate">{item.job?.company}</p>
      </Link>

      <div className="flex items-center gap-2 mt-2 text-[10px] text-on-surface-variant">
        {item.matchAtApply != null && <span className="font-bold">{item.matchAtApply}% match</span>}
        {item.job?.deadline && (
          <span>{new Date(item.job.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        )}
      </div>

      {/* Movement controls stay keyboard-reachable rather than drag-only. */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {previous && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove(item, previous)}
            aria-label={`Move ${item.job?.title} back to ${previous}`}
            className="w-6 h-6 rounded flex items-center justify-center text-outline-variant hover:text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
        )}
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove(item, next)}
            aria-label={`Move ${item.job?.title} forward to ${next}`}
            className="w-6 h-6 rounded flex items-center justify-center text-outline-variant hover:text-primary hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.job?.title}`}
          className="w-6 h-6 rounded flex items-center justify-center text-outline-variant hover:text-error hover:bg-error/10 ml-auto"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </li>
  );
}

/**
 * The placement pipeline. Reads the same Application records the jobs pages
 * write, so applying to a job puts it here with no extra step.
 */
export default function Tracker() {
  const { data, loading, error, refetch } = useApiResource('/jobs/applications');
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingBlock label="Loading your applications" className="min-h-dvh" />;
  if (error && !data) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const byStage = Object.fromEntries((data.stages ?? []).map((s) => [s.key, s.items]));

  async function move(item, stage) {
    setBusy(true);
    try {
      await api.post(`/jobs/${item.job._id}/track`, { stage });
      await refetch({ quiet: true });
    } catch (caught) {
      window.alert(caught.message || 'Could not move that application.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove ${item.job?.title} from your tracker?`)) return;
    setBusy(true);
    try {
      await api.delete(`/jobs/${item.job._id}/track`);
      await refetch({ quiet: true });
    } catch (caught) {
      window.alert(caught.message || 'Could not remove that application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
              Placement tracker
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {data.total === 0
                ? 'Every job you save or apply to appears here.'
                : `${data.total} ${data.total === 1 ? 'application' : 'applications'} in your pipeline.`}
            </p>
          </div>
          <Link
            to="/jobs"
            className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-dim transition-colors"
          >
            Browse jobs
          </Link>
        </header>

        {data.total === 0 ? (
          <EmptyBlock
            icon="work_history"
            title="Nothing tracked yet"
            description="Save a job or mark one as applied and it will show up in this pipeline."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {STAGES.map((stage) => {
              const items = byStage[stage.key] ?? [];
              return (
                <section key={stage.key} className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${stage.accent}`} aria-hidden="true" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {stage.label}
                    </h2>
                    <span className="text-xs font-black text-outline ml-auto tabular-nums">
                      {items.length}
                    </span>
                  </div>

                  <ul className="space-y-2 min-h-[3rem] rounded-lg bg-surface-container-low/50 p-2">
                    {items.length === 0 ? (
                      <li className="text-[11px] text-outline text-center py-2">Empty</li>
                    ) : (
                      items.map((item) => (
                        <Card
                          key={item._id}
                          item={item}
                          busy={busy}
                          onMove={move}
                          onRemove={remove}
                        />
                      ))
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
