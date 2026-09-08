import React from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource.js';

const areas = [
  { title: 'Coding problems', description: 'Practise data structures and algorithms with real test cases.', to: '/coding-practice', icon: 'code' },
  { title: 'Skills & assessments', description: 'Claim skills, verify your level and review previous attempts.', to: '/skills', icon: 'verified' },
  { title: 'Aptitude & communication', description: 'Take timed placement tests and learn from detailed reviews.', to: '/skill-test', icon: 'quiz' },
  { title: 'Previous-year questions', description: 'Filter questions by company, round, topic and difficulty.', to: '/pyq-library', icon: 'history_edu' },
  { title: 'Company preparation', description: 'Prepare for the exact rounds used by your target companies.', to: '/company-prep', icon: 'apartment' },
  { title: 'Mock interview coaching', description: 'Practise an interview, identify one weakness and retry.', to: '/ai-interview', icon: 'psychology' },
];

export default function Practice() {
  const { data } = useApiResource('/dashboard');
  const { data: track } = useApiResource('/practice/track');
  const weakest = data?.readiness?.components?.find((item) => item.key === data.readiness.weakest);

  const stage = track?.stage;
  const focus = track?.countBySubject ?? [];

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Preparation hub</p>
          <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">Practice with a purpose</h1>
          <p className="text-sm text-on-surface-variant mt-1">Choose by weakness, role or semester — not by whichever tool happens to be in the menu.</p>
        </header>

        {stage && (
          <section className="rounded-xl bg-inverse-surface text-white p-6 overflow-hidden relative">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/40 blur-[100px]" />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-black opacity-70">
                    {track.semesterSource === 'suggested' ? `Semester ${track.semester} · from your graduation year` : `Semester ${track.semester}`}
                  </p>
                  <h2 className="font-headline text-xl font-black mt-1">
                    {stage.semesters[0]}–{stage.semesters[1]} · {stage.label}
                  </h2>
                  <p className="text-sm opacity-80 mt-2 max-w-2xl leading-relaxed">{stage.description}</p>
                </div>
                <Link
                  to="/profile"
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white/10 text-sm font-bold hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit semester
                </Link>
              </div>

              <p className="text-[10px] uppercase tracking-[0.18em] font-black opacity-70 mt-5">Your track this term</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {focus.map((entry) => (
                  <Link
                    key={entry.subjectId}
                    to={entry.subjectId === 'dsa' ? '/coding-practice' : `/skill-test?subject=${encodeURIComponent(entry.subjectId)}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold hover:bg-white/20 transition-colors"
                  >
                    {entry.subjectLabel}
                    <span className="opacity-60 font-semibold">
                      {entry.levelLabel}
                      {entry.problems ? ` · ${entry.problems} problems` : entry.tests ? ` · ${entry.tests} tests` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {weakest && (
          <section className="rounded-xl bg-surface-container-lowest border border-outline-variant/60 p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-black text-primary">Best place to start</p>
              <h2 className="font-headline text-lg font-black mt-1">Improve {weakest.label.toLowerCase()}</h2>
              <p className="text-sm text-on-surface-variant mt-1">It is currently your lowest readiness signal at {weakest.value}%.</p>
            </div>
            <Link to={data.recommendations?.[0]?.action?.to ?? '/my-plan'} className="px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold text-center">
              Start recommended work
            </Link>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {areas.map((area) => (
            <Link key={area.to} to={area.to} className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5 flex gap-4 hover:border-primary/40 transition-colors">
              <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">{area.icon}</span>
              </span>
              <div>
                <h2 className="font-bold">{area.title}</h2>
                <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{area.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
