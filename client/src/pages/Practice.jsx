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
  const weakest = data?.readiness?.components?.find((item) => item.key === data.readiness.weakest);

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Preparation hub</p><h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight mt-1">Practice with a purpose</h1><p className="text-sm text-on-surface-variant mt-1">Choose by weakness, role or company—not by whichever tool happens to be in the menu.</p></header>
        {weakest && <section className="rounded-xl bg-inverse-surface text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.18em] font-black opacity-70">Best place to start</p><h2 className="font-headline text-lg font-black mt-1">Improve {weakest.label.toLowerCase()}</h2><p className="text-sm opacity-75">It is currently your lowest readiness signal at {weakest.value}%.</p></div><Link to={data.recommendations?.[0]?.action?.to ?? '/my-plan'} className="px-4 py-2.5 rounded-full bg-white text-inverse-surface text-sm font-bold text-center">Start recommended work</Link></section>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{areas.map((area) => <Link key={area.to} to={area.to} className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5 flex gap-4 hover:border-primary/40 transition-colors"><span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined">{area.icon}</span></span><div><h2 className="font-bold">{area.title}</h2><p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{area.description}</p></div></Link>)}</div>
      </div>
    </div>
  );
}
