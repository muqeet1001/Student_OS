import React from 'react';

/**
 * Cinematic brand panel shared by the sign-in and sign-up screens.
 * The local video is a compressed excerpt of royalty-free Pixabay footage;
 * the poster remains visible when autoplay or motion is disabled.
 */
export default function AuthShowcase() {
  return (
    <section className="auth-showcase relative isolate flex min-h-[19rem] overflow-hidden bg-primary lg:min-h-0 lg:w-[54%]">
      <img
        src="/media/auth-motion-poster.webp"
        alt="Students walking toward a university library"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <video
        className="auth-showcase-video absolute inset-0 h-full w-full object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/auth-motion-poster.webp"
        aria-hidden="true"
      >
        <source src="/media/auth-motion.mp4" type="video/mp4" />
      </video>

      <div className="auth-showcase-wash absolute inset-0" />
      <div className="auth-showcase-grain absolute inset-0 opacity-30 mix-blend-soft-light" />

      <div className="relative z-10 flex w-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10 xl:p-12">
        <header className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-primary shadow-[0_10px_30px_rgba(80,24,3,0.2)]">
              <span
                className="material-symbols-outlined text-[1.35rem]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                rocket_launch
              </span>
            </span>
            <span className="font-headline text-xl font-black tracking-[-0.05em]">Student OS</span>
          </div>

          <span className="rounded-full border border-white/30 bg-black/10 px-4 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] backdrop-blur-md">
            Career mode · live
          </span>
        </header>

        <div className="mt-10 max-w-[42rem] lg:mt-auto">
          <p className="mb-4 flex items-center gap-3 text-[0.72rem] font-extrabold uppercase tracking-[0.28em] text-white/85">
            <span className="h-px w-10 bg-white/70" />
            Your next move starts here
          </p>
          <h1 className="font-headline text-[clamp(3rem,5.4vw,7rem)] font-black leading-[0.88] tracking-[-0.075em]">
            Learn.
            <br />
            Build. <span className="font-medium italic">Become.</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-sm font-semibold leading-relaxed text-white/85 sm:text-base">
            One focused workspace for the skills, proof and confidence that turn ambition into an offer.
          </p>
        </div>

        <footer className="mt-7 flex items-end justify-between gap-5 border-t border-white/25 pt-5">
          <div className="grid grid-cols-3 gap-5 sm:gap-8">
            {[
              ['01', 'Practice'],
              ['02', 'Prove'],
              ['03', 'Progress'],
            ].map(([number, label]) => (
              <div key={number}>
                <div className="font-mono text-[0.6rem] text-white/60">{number}</div>
                <div className="mt-1 text-xs font-extrabold uppercase tracking-[0.13em]">{label}</div>
              </div>
            ))}
          </div>

          <a
            href="https://pixabay.com/videos/university-library-school-college-256696/"
            target="_blank"
            rel="noreferrer"
            className="hidden text-right text-[0.58rem] font-bold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white sm:block"
          >
            Film · Media Hopper Studio
          </a>
        </footer>
      </div>
    </section>
  );
}
