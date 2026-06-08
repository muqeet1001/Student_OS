import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

const tests = [
  ['Aptitude Sprint', '18 questions', '24 min', 'Quant, reasoning, and speed checks'],
  ['Technical MCQ', '32 questions', '40 min', 'DSA, DBMS, OS, CN, and OOP fundamentals'],
  ['Communication Round', '8 prompts', '16 min', 'Scenario answers and clarity scoring'],
];

export default function SkillTest() {
  return (
    <div className="page-export page-skill-test bg-background font-body text-on-surface min-h-screen">
      <SideNavBar />

      <main className="ml-72 min-h-screen">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-outline-variant/20">
          <div className="flex flex-col gap-5 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Readiness lab</p>
              <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-on-surface mt-2">Skill Test</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="h-11 px-5 rounded-full bg-surface-container-high text-on-surface font-bold hover:bg-surface-container-highest transition-colors">
                View History
              </button>
              <button className="h-11 px-5 rounded-full bg-primary-container text-on-primary-container font-bold shadow-[0px_12px_24px_rgba(255,120,78,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                Start Test
              </button>
            </div>
          </div>
        </header>

        <section className="p-6 md:p-10 space-y-8 pb-28">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <article className="xl:col-span-8 rounded-xl bg-inverse-surface text-white p-8 md:p-10 overflow-hidden relative">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-[90px]" />
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-primary-container">
                  <span className="material-symbols-outlined text-base">bolt</span>
                  Adaptive scoring enabled
                </span>
                <h2 className="font-headline text-3xl md:text-5xl font-black tracking-tight mt-6">
                  Know exactly where your placement prep stands.
                </h2>
                <p className="text-inverse-on-surface text-lg leading-8 mt-5">
                  This route was missing from the HTML batch, so it has been added to match the same dashboard system: rounded editorial cards, warm primary actions, and clear placement-focused modules.
                </p>
              </div>
            </article>

            <aside className="xl:col-span-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-[0px_24px_48px_rgba(14,14,14,0.04)]">
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.16em]">Today</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-primary-container p-5">
                  <p className="text-3xl font-black font-headline text-on-primary-container">84%</p>
                  <p className="text-sm font-bold text-on-primary-container/75 mt-1">Readiness</p>
                </div>
                <div className="rounded-lg bg-secondary-fixed p-5">
                  <p className="text-3xl font-black font-headline text-on-secondary-fixed">11</p>
                  <p className="text-sm font-bold text-on-secondary-fixed-variant mt-1">Tests done</p>
                </div>
              </div>
              <div className="mt-6 rounded-lg bg-surface-container p-5">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Target company fit</span>
                  <span className="text-primary">Strong</span>
                </div>
                <div className="mt-4 h-3 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-primary" />
                </div>
              </div>
            </aside>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {tests.map(([title, count, time, description]) => (
              <article className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-[0px_16px_32px_rgba(14,14,14,0.04)]" key={title}>
                <div className="flex items-start justify-between gap-4">
                  <div className="h-12 w-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">assignment</span>
                  </div>
                  <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-xs font-black text-on-tertiary-fixed uppercase tracking-wider">New</span>
                </div>
                <h2 className="font-headline text-2xl font-black mt-6">{title}</h2>
                <p className="text-on-surface-variant leading-7 mt-3">{description}</p>
                <div className="flex flex-wrap gap-3 mt-6 text-sm font-bold text-on-surface-variant">
                  <span className="rounded-full bg-surface-container px-3 py-2">{count}</span>
                  <span className="rounded-full bg-surface-container px-3 py-2">{time}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
