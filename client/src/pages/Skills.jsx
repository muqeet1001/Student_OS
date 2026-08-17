import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';
import ProctoringGuard from '../features/proctoring/ProctoringGuard.jsx';

const LEVEL_TONES = {
  advanced: 'bg-green-100 text-green-800',
  intermediate: 'bg-secondary-container text-on-secondary-container',
  beginner: 'bg-surface-container text-on-surface-variant',
};

/**
 * Attempts arrive with the assessment list, not from a request per card.
 *
 * Each card used to fetch `/skills/:skill/history` itself, so opening this
 * page cost one round trip per assessment — ten of them, on top of the list
 * request that had already returned every attempt in its `history` field. The
 * data was fetched twice and the second time was serialised behind the first.
 * On a campus connection that is a visible stall for nothing.
 */
function History({ attempts }) {
  if (attempts.length < 2) return null;

  const max = Math.max(...attempts.map((a) => a.percentage), 100);

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant/60">
      <p className="text-[10px] font-black uppercase tracking-wider text-outline mb-2">
        Your attempts
      </p>
      <div className="flex items-end gap-1 h-10">
        {attempts.map((attempt) => (
          <div
            key={attempt._id}
            title={`${attempt.percentage}% on ${new Date(attempt.submittedAt).toLocaleDateString()}`}
            className="flex-1 bg-primary/70 rounded-t min-h-[2px]"
            style={{ height: `${(attempt.percentage / max) * 100}%` }}
          />
        ))}
      </div>
      <p className="text-[10px] text-on-surface-variant mt-1">
        {attempts[0].percentage}% → {attempts.at(-1).percentage}%
      </p>
    </div>
  );
}

function AssessmentCard({ assessment, attempts, onStart, starting }) {
  const { latest } = assessment;

  return (
    <article className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-bold text-sm">{assessment.skill}</h2>
        {latest ? (
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
              LEVEL_TONES[latest.level]
            }`}
          >
            ✓ {latest.level}
          </span>
        ) : (
          assessment.declared && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-2xl bg-surface-container text-on-surface-variant shrink-0">
              unverified
            </span>
          )
        )}
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed flex-1">
        {assessment.description}
      </p>

      <p className="text-[10px] text-outline mt-2">
        {assessment.durationMinutes} min
        {latest && ` · last scored ${latest.percentage}%`}
      </p>

      <History attempts={attempts} />

      <button
        type="button"
        disabled={starting || !assessment.canAttempt}
        onClick={() => onStart(assessment)}
        className={`mt-3 w-full py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-60 ${
          latest
            ? 'bg-surface-container hover:bg-surface-container-high'
            : 'bg-primary text-on-primary hover:bg-primary-dim'
        }`}
      >
        {!assessment.canAttempt
          ? `Retake in ${assessment.cooldownDays}d`
          : latest
            ? 'Retake to improve'
            : 'Verify this skill'}
      </button>
    </article>
  );
}

/**
 * The verification hub. A skill on a profile is a claim until it is passed
 * here, which is what makes "verified" mean anything downstream in job
 * matching and the admin shortlist.
 */
export default function Skills() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiResource('/skills');
  const [starting, setStarting] = useState(false);
  const [pendingAssessment, setPendingAssessment] = useState(null);

  async function start(assessment) {
    setStarting(true);
    try {
      const session = await api.post(`/skills/${encodeURIComponent(assessment.skill)}/start`);
      navigate(`/skills/attempt/${session.attemptId}`, { state: { session } });
    } catch (caught) {
      window.alert(caught.message || 'Could not start that assessment.');
      setStarting(false);
      setPendingAssessment(null);
    }
  }

  const assessments = data?.assessments ?? [];
  const verified = assessments.filter((item) => item.latest).length;

  // Grouped once here rather than filtered inside each card, so rendering
  // stays linear in the number of attempts instead of cards × attempts.
  const attemptsBySkill = useMemo(() => {
    const grouped = new Map();

    // The API returns newest first; the chart reads left to right in time.
    for (const attempt of [...(data?.history ?? [])].reverse()) {
      grouped.set(attempt.skill, [...(grouped.get(attempt.skill) ?? []), attempt]);
    }

    return grouped;
  }, [data]);

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      {pendingAssessment && (
        <ProctoringGuard
          active
          onReady={() => start(pendingAssessment)}
          onCancel={() => setPendingAssessment(null)}
        />
      )}
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            Skill verification
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {verified > 0
              ? `${verified} of ${assessments.length} verified. A verified skill outranks a self-declared one everywhere it is used.`
              : 'Anyone can list a skill. Passing an assessment is what makes recruiters and your placement office take it seriously.'}
          </p>
        </header>

        {loading && !data && <LoadingBlock label="Loading assessments" />}
        {error && <ErrorBlock error={error} onRetry={refetch} />}

        {!loading && !error && assessments.length === 0 && (
          <EmptyBlock
            icon="quiz"
            title="No assessments available"
            description="Run the seed script to load the skill assessment bank."
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment._id}
              assessment={assessment}
              attempts={attemptsBySkill.get(assessment.skill) ?? []}
              onStart={setPendingAssessment}
              starting={starting}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
