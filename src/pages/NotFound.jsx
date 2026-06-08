import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="not-found">
      <div className="max-w-xl rounded-xl bg-white p-8 shadow-[0px_24px_48px_rgba(14,14,14,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mt-3 font-headline text-4xl font-black tracking-tight text-on-surface">Page not found</h1>
        <p className="mt-4 text-on-surface-variant leading-7">This screen is not wired into Student OS yet.</p>
        <Link className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary-container px-5 font-bold text-on-primary-container" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
