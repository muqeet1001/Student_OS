import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

/** Where a student goes to close each kind of gap. */
const FIX_ROUTES = {
  skill: { to: '/skill-test', label: 'Verify with a test' },
  coding: { to: '/coding-practice', label: 'Practise problems' },
  resume: { to: '/resume-builder', label: 'Improve resume' },
};

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { data, setData, loading, error, refetch } = useApiResource(`/jobs/${jobId}`);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingBlock label="Loading role" className="min-h-dvh" />;
  if (error && !data) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { job, match, potential, application } = data;

  async function track(stage) {
    setBusy(true);
    try {
      const result = await api.post(`/jobs/${jobId}/track`, { stage });
      setData((current) => ({ ...current, application: result.application }));
    } catch (caught) {
      window.alert(caught.message || 'Could not update this job.');
    } finally {
      setBusy(false);
    }
  }

  const requiredMissing = match?.missing.filter((item) => item.required) ?? [];
  const applied = application && application.stage !== 'saved';

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant hover:text-primary"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          All jobs
        </Link>

        <header className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
                {job.title}
              </h1>
              <p className="text-sm text-on-surface-variant mt-0.5">
                {job.company}
                {job.location && ` · ${job.location}`}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {[job.type, job.workMode, job.compensation].filter(Boolean).map((item) => (
                  <span
                    key={item}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant capitalize"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {match && (
              <div className="text-right shrink-0">
                <p className="text-3xl font-black font-headline tabular-nums leading-none">
                  {match.score}%
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1">
                  your match
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant/60">
            <button
              type="button"
              disabled={busy}
              onClick={() => track(applied ? 'saved' : 'applied')}
              className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-dim transition-colors disabled:opacity-60"
            >
              {applied ? 'Applied ✓' : 'Mark as applied'}
            </button>

            {!application && (
              <button
                type="button"
                disabled={busy}
                onClick={() => track('saved')}
                className="px-5 py-2.5 rounded-lg bg-surface-container font-bold text-sm hover:bg-surface-container-high transition-colors disabled:opacity-60"
              >
                Save for later
              </button>
            )}

            {job.applyUrl && (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-surface-container font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                Open posting ↗
              </a>
            )}

            <Link
              to={`/resume-builder?job=${jobId}`}
              className="px-5 py-2.5 rounded-lg bg-surface-container font-bold text-sm hover:bg-surface-container-high transition-colors"
            >
              Tailor resume
            </Link>

            {application && (
              <button
                type="button"
                disabled={busy}
                onClick={() => navigate('/tracker')}
                className="px-5 py-2.5 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                View in tracker
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* What to do about the gap — the reason this page exists. */}
          <aside className="lg:order-2 space-y-3">
            {match && (
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
                  Your match
                </h2>

                <ul className="space-y-2 mb-4">
                  {Object.entries(match.breakdown).map(([key, value]) => (
                    <li key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-on-surface-variant capitalize">{key}</span>
                        <span className="font-black tabular-nums">{value}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-on-surface/30 rounded-full"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                {match.blockers.length > 0 && (
                  <div className="rounded-lg bg-error-container/20 border border-error/20 p-3 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-on-error-container mb-1">
                      Eligibility
                    </p>
                    <ul className="text-xs text-on-error-container space-y-0.5">
                      {match.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] font-black uppercase tracking-wider text-outline mb-1.5">
                  You have
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {match.matched.length === 0 ? (
                    <span className="text-xs text-on-surface-variant">
                      None of the listed skills yet.
                    </span>
                  ) : (
                    match.matched.map((skill) => (
                      <span
                        key={skill.name}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-2xl ${
                          skill.verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {skill.verified ? '✓ ' : ''}
                        {skill.name}
                      </span>
                    ))
                  )}
                </div>

                {match.missing.length > 0 && (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-wider text-outline mb-1.5">
                      You need
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.missing.map((skill) => (
                        <span
                          key={skill.name}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant"
                        >
                          {skill.name}
                          {skill.required && <span className="text-primary">*</span>}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* The bridge from "you don't match" to "here is how you would". */}
            {potential != null && potential > match.score && (
              <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-bold text-on-surface">
                  Close these gaps and your match becomes{' '}
                  <span className="text-primary font-black">{potential}%</span>.
                </p>

                <ul className="mt-2.5 space-y-1.5">
                  {requiredMissing.slice(0, 3).map((skill) => (
                    <li key={skill.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold truncate">{skill.name}</span>
                      <Link
                        to={FIX_ROUTES.skill.to}
                        className="text-primary font-bold shrink-0 hover:underline"
                      >
                        {FIX_ROUTES.skill.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>

          <div className="lg:col-span-2 lg:order-1 space-y-3">
            {job.aboutCompany && (
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-2">
                  About {job.company}
                </h2>
                <p className="text-sm leading-relaxed text-on-surface-variant">{job.aboutCompany}</p>
              </section>
            )}

            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-2">
                The role
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-on-surface-variant">
                {job.description}
              </p>

              {(job.requirements.minCgpa || job.requirements.branches.length > 0) && (
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-outline-variant/60 text-xs text-on-surface-variant">
                  {job.requirements.minCgpa && (
                    <span>
                      Minimum CGPA <strong>{job.requirements.minCgpa}</strong>
                    </span>
                  )}
                  {job.requirements.graduationYear && (
                    <span>
                      Graduating <strong>{job.requirements.graduationYear}</strong>
                    </span>
                  )}
                  {job.requirements.branches.length > 0 && (
                    <span>{job.requirements.branches.join(', ')}</span>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
