import React from 'react';
import { useApiResource } from '../../hooks/useApiResource.js';

/**
 * The written reading of the placement position.
 *
 * Loaded separately from the analytics it describes, so the numbers on the
 * page never wait for a model. If the narrative is slow, missing or refused,
 * everything else on the Insights tab is already on screen and correct.
 */
export default function PlacementInsight() {
  const { data, loading, error } = useApiResource('/admin/analytics/insight');

  if (loading && !data) {
    return (
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
        <p className="text-xs text-on-surface-variant">Reading the numbers…</p>
      </section>
    );
  }

  // A failure here is not worth a red box — the page below it is intact and
  // useful. Stay quiet rather than alarming an officer about a missing
  // paragraph.
  if (error) return null;

  const { insight, error: reason, ai } = data;

  if (!insight) {
    return (
      <section className="bg-surface-container-low rounded-xl border border-outline-variant/60 p-4">
        <p className="text-xs text-on-surface-variant">
          {reason ?? ai.reason ?? 'No written summary is available.'}
        </p>
        <p className="text-[11px] text-outline mt-1">
          Every figure on this page is computed without it.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
          Where this cohort stands
        </h3>
        {/*
          Labelled, always. A reader has to be able to tell which sentences a
          model wrote and which numbers the system computed.
        */}
        <span className="text-[9px] font-black uppercase tracking-wider text-outline shrink-0">
          Written by {ai.model ?? 'AI'}
        </span>
      </div>

      {insight.headline && (
        <p className="font-headline text-base font-black leading-snug">{insight.headline}</p>
      )}

      {insight.summary && (
        <p className="text-sm text-on-surface-variant leading-relaxed mt-2">{insight.summary}</p>
      )}

      {insight.priorities.length > 0 && (
        <>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-outline mt-4 mb-2">
            Do these first
          </h4>
          <ol className="space-y-2.5">
            {insight.priorities.map((priority, index) => (
              <li key={priority.id} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{priority.title}</p>
                  {/* Ours — the counted reason behind the finding. */}
                  <p className="text-xs text-on-surface-variant mt-0.5">{priority.reason}</p>
                  {/* The model's contribution: why this one is first. */}
                  {priority.why && (
                    <p className="text-xs text-outline italic mt-0.5">{priority.why}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {insight.watch && (
        <p className="text-xs text-on-surface-variant mt-4 pt-3 border-t border-outline-variant/60">
          <span className="font-bold">Watch: </span>
          {insight.watch}
        </p>
      )}

      <p className="text-[10px] text-outline mt-3 leading-relaxed">
        Every number above is computed from your data. The model chooses the order and explains it —
        it cannot introduce a recommendation or restate a figure.
      </p>
    </section>
  );
}
