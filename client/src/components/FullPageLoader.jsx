import React from 'react';

export default function FullPageLoader({ label = 'Loading' }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-surface-container-highest" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
    </div>
  );
}
