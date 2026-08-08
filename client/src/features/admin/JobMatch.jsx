import React, { useState } from 'react';
import { api } from '../../lib/api.js';
import { EmptyBlock, ErrorBlock } from '../../components/StateBlocks.jsx';

function SkillChip({ name, required, verified, muted }) {
  const tone = muted
    ? 'bg-surface-container text-on-surface-variant'
    : verified
      ? 'bg-green-100 text-green-800'
      : 'bg-primary/10 text-primary';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-2xl ${tone}`}>
      {verified && (
        <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: '"FILL" 1' }}>
          verified
        </span>
      )}
      {name}
      {required && !muted && <span className="opacity-60">*</span>}
    </span>
  );
}

function CandidateRow({ student, rank }) {
  const [open, setOpen] = useState(false);
  const { match } = student;

  const tone =
    match.score >= 70 ? 'text-green-700' : match.score >= 45 ? 'text-on-secondary-container' : 'text-error';

  return (
    <li className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-container-low/60 transition-colors"
      >
        <span className="w-7 h-7 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-xs font-black">
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{student.name}</p>
          <p className="text-xs text-on-surface-variant truncate">
            {[student.branch, student.graduationYear].filter(Boolean).join(' · ') || student.email}
          </p>
        </div>

        <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-[18rem]">
          {match.matched.slice(0, 4).map((skill) => (
            <SkillChip key={skill.name} {...skill} />
          ))}
        </div>

        <div className="text-right shrink-0 w-16">
          <p className={`text-lg font-black ${tone}`}>{match.score}%</p>
          <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">match</p>
        </div>

        <span className={`material-symbols-outlined text-outline-variant transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-outline-variant/10">
          {match.blockers.length > 0 && (
            <div className="rounded-lg bg-error-container/15 border border-error/20 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-on-error-container mb-1">
                Does not meet
              </p>
              <ul className="text-xs text-on-error-container space-y-0.5">
                {match.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(match.breakdown).map(([key, value]) => (
              <div key={key} className="bg-surface-container-low rounded-lg p-2">
                <p className="text-sm font-black">{value}%</p>
                <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold capitalize">
                  {key}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-outline mb-1.5">Has</p>
            <div className="flex flex-wrap gap-1">
              {match.matched.length === 0 ? (
                <span className="text-xs text-on-surface-variant">None of the listed skills.</span>
              ) : (
                match.matched.map((skill) => <SkillChip key={skill.name} {...skill} />)
              )}
            </div>
          </div>

          {match.missing.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-outline mb-1.5">Missing</p>
              <div className="flex flex-wrap gap-1">
                {match.missing.map((skill) => (
                  <SkillChip key={skill.name} {...skill} muted />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-on-surface-variant">{match.reasons.join(' · ')}</p>
        </div>
      )}
    </li>
  );
}

/**
 * Paste a job description, get a ranked shortlist.
 *
 * The parsed requirements are shown back so staff can see what was
 * understood — a silent mis-parse would quietly produce the wrong shortlist.
 */
export default function JobMatch() {
  const [description, setDescription] = useState('');
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function run(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setResult(await api.post('/admin/match', { description, limit }));
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <form onSubmit={run} className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-3">
        <div>
          <h2 className="font-headline text-base font-bold">Shortlist for a role</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Paste a job description. Students are ranked on skill overlap, verified skills,
            readiness and evidence of real work.
          </p>
        </div>

        <label htmlFor="jd" className="sr-only">
          Job description
        </label>
        <textarea
          id="jd"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={7}
          required
          minLength={20}
          placeholder={'Backend Engineer — Graduate Programme\n\nRequired: Node.js, Express, MongoDB, data structures.\nPreferred: Docker, AWS.\nMinimum CGPA 7.5. CSE and IT, graduating 2026.'}
          className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-container"
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="limit" className="text-xs font-bold uppercase tracking-wider text-outline">
            Show top
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="bg-surface-container-low border border-outline-variant/20 rounded-full px-3 py-1.5 text-sm font-bold cursor-pointer"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading || description.trim().length < 20}
            className="ml-auto px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {loading ? 'Ranking…' : 'Find candidates'}
          </button>
        </div>
      </form>

      {error && <ErrorBlock error={error} />}

      {result && (
        <>
          <div className="bg-surface-container-low rounded-xl p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-outline">
                Understood from the description
              </p>
              <p className="text-xs text-on-surface-variant">
                {result.students.length} of {result.totalConsidered} students
              </p>
            </div>

            {result.requirements.skills.length === 0 ? (
              <p className="text-xs text-error font-bold">
                No known skills found — the ranking below reflects readiness only. Try listing
                technologies explicitly.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {result.requirements.skills.map((skill) => (
                  <SkillChip key={skill.name} name={skill.name} required={skill.required} />
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
              {result.requirements.minCgpa && <span>Min CGPA {result.requirements.minCgpa}</span>}
              {result.requirements.graduationYear && (
                <span>Graduating {result.requirements.graduationYear}</span>
              )}
              {result.requirements.branches.length > 0 && (
                <span>{result.requirements.branches.join(', ')}</span>
              )}
              <span className="text-outline">* required</span>
            </div>
          </div>

          {result.students.length === 0 ? (
            <EmptyBlock
              icon="person_search"
              title="No students to rank"
              description="Seed the database or widen the filters."
            />
          ) : (
            <ol className="space-y-2">
              {result.students.map((student, index) => (
                <CandidateRow key={student._id} student={student} rank={index + 1} />
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
