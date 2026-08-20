import React, { useId, useState } from 'react';

/**
 * Labelled input used across the auth screens. Password fields get a
 * show/hide toggle in place of the decorative icon.
 */
export default function FormField({
  label,
  type = 'text',
  icon,
  error,
  action,
  className = '',
  ...inputProps
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && revealed ? 'text' : type;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label className="text-[0.7rem] font-extrabold text-on-surface-variant uppercase tracking-[0.17em]" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>

      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-4 py-3.5 pr-14 rounded-xl bg-[#f7f5f2] border text-on-surface font-semibold placeholder:font-medium placeholder:text-outline/60 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
            error
              ? 'border-error/40 focus:border-error/60 focus:ring-error/10'
              : 'border-outline-variant/65 hover:border-outline focus:border-primary/60 focus:ring-primary/10'
          }`}
          {...inputProps}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-outline hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              {revealed ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        ) : (
          icon && (
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              {icon}
            </span>
          )
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="text-xs font-bold text-error px-1 pt-1">
          {error}
        </p>
      )}
    </div>
  );
}
