import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="min-h-dvh grid place-items-center p-8 bg-background">
      <div className="max-w-xl w-full rounded-xl bg-surface-container-lowest p-8 md:p-10 shadow-[0px_24px_48px_rgba(14,14,14,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mt-3 font-headline text-4xl font-black tracking-tight text-on-surface">
          Page not found
        </h1>
        <p className="mt-4 text-on-surface-variant leading-7">
          That screen does not exist. It may have moved, or the link may be out of date.
        </p>
        <Link
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary-container px-6 font-bold text-on-primary-container hover:scale-[1.02] transition-transform"
          to="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
