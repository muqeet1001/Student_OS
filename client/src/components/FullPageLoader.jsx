import React from 'react';

export default function FullPageLoader({ label = 'Loading' }) {
  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[#f2eee8] p-7 text-on-surface"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white">
            <span className="material-symbols-outlined text-base">rocket_launch</span>
          </span>
          <span className="font-headline text-base font-black tracking-[-0.05em]">Student OS</span>
        </div>
        <span className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.2em] text-outline">
          System / Loading
        </span>
      </div>

      <div className="m-auto flex w-full max-w-[30rem] flex-col items-center text-center">
        <div className="relative mb-7 grid h-24 w-24 place-items-center rounded-full bg-primary text-white shadow-[0_18px_50px_rgba(217,74,18,0.28)]">
          <span className="font-headline text-3xl font-black tracking-[-0.09em]">S/OS</span>
          <span className="absolute -inset-2 animate-spin rounded-full border border-primary/25 border-t-primary" />
        </div>
        <p className="font-headline text-2xl font-black tracking-[-0.04em]">{label}<span className="text-primary">.</span></p>
        <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white">
          <div className="student-loader-bar h-full w-2/5 rounded-full bg-primary" />
        </div>
        <p className="mt-3 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-outline">
          Preparing your next move
        </p>
      </div>
    </div>
  );
}
