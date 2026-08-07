import React from 'react';

/**
 * The marketing panel shared by the sign-in and sign-up screens.
 */
export default function AuthShowcase() {
  return (
    // Pinned to the viewport so the collage can never push the page taller
    // than one screen — it previously sized itself from its own content.
    <section className="hidden lg:flex lg:w-1/2 lg:h-dvh lg:sticky lg:top-0 p-6 xl:p-8 bg-inverse-surface relative overflow-hidden flex-col justify-between">
      <div className="z-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
              rocket_launch
            </span>
          </span>
          <span className="text-2xl font-black tracking-tighter text-white font-headline">Student OS</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight mb-6">
            The Structured <span className="text-primary-container">Playground</span> for Careers.
          </h1>
          <p className="text-inverse-on-surface text-sm leading-relaxed">
            Master technical skills, build an editorial-grade resume, and ace AI-powered interviews in
            one unified ecosystem.
          </p>
        </div>
      </div>

      <div className="bento-grid flex-1 min-h-0 max-h-[22rem] mt-8 relative z-10">
        <div className="col-span-2 row-span-2 bg-tertiary-fixed rounded-xl p-6 flex flex-col justify-between transform rotate-2">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-on-tertiary-fixed text-4xl">psychology</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-on-tertiary-fixed tracking-widest uppercase">
              Soft Skills
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-on-tertiary-fixed mb-2">92%</div>
            <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-on-tertiary-fixed w-[92%]" />
            </div>
          </div>
        </div>

        <div className="col-span-2 row-span-1 bg-secondary-fixed rounded-xl p-6 flex items-center gap-4 transform -rotate-1">
          <div className="w-12 h-12 rounded-full border-2 border-white bg-on-secondary-fixed/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary-fixed">school</span>
          </div>
          <div>
            <div className="text-on-secondary-fixed font-bold">Placement ready</div>
            <div className="text-on-secondary-fixed-variant text-xs font-medium">
              Track every round in one place
            </div>
          </div>
        </div>

        <div className="col-span-1 row-span-2 bg-surface-container-highest/20 backdrop-blur-xl rounded-xl p-4 flex flex-col items-center justify-center border border-white/10">
          <span className="material-symbols-outlined text-primary-container text-3xl mb-2">code</span>
          <div className="text-[10px] font-mono text-white/60">main.js</div>
        </div>

        <div className="col-span-1 row-span-1 bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-transform">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            verified
          </span>
        </div>
      </div>

      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-tertiary/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4" />
    </section>
  );
}
