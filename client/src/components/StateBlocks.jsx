import React from 'react';

export function LoadingBlock({ label = 'Loading', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-on-surface-variant ${className}`}>
      <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry, className = '' }) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-4 py-10 px-6 text-center rounded-xl bg-error-container/10 border border-error/20 ${className}`}
    >
      <span className="material-symbols-outlined text-error text-4xl">cloud_off</span>
      <div>
        <p className="font-bold text-on-surface">Something went wrong</p>
        <p className="text-sm text-on-surface-variant mt-1">
          {error?.message || 'We could not load this section.'}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="px-6 py-2.5 rounded-full bg-inverse-surface text-white font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ icon = 'inbox', title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center gap-3 py-14 px-6 text-center rounded-xl border-2 border-dashed border-outline-variant/30 ${className}`}
    >
      <span className="material-symbols-outlined text-4xl text-outline-variant">{icon}</span>
      <div>
        <p className="font-bold text-on-surface">{title}</p>
        {description && <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
