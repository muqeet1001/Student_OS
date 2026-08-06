import React, { useId, useState } from 'react';

const baseInput =
  'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-4 py-3 text-sm text-on-surface font-medium placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary-container transition-all';

function Shell({ label, hint, error, id, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-outline uppercase tracking-wider">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-bold text-error">{error}</p>
      ) : (
        hint && <p className="text-xs text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}

export function Input({ label, hint, error, className, ...props }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} id={id} className={className}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={`${baseInput} ${error ? 'border-error/40' : ''}`}
        {...props}
      />
    </Shell>
  );
}

export function Textarea({ label, hint, error, rows = 4, className, ...props }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} id={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`${baseInput} resize-y ${error ? 'border-error/40' : ''}`}
        {...props}
      />
    </Shell>
  );
}

export function Select({ label, hint, error, options = [], className, ...props }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} id={id} className={className}>
      <select id={id} className={`${baseInput} cursor-pointer`} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

/** Comma/Enter separated chips, used for tech stacks, target roles and tags. */
export function TagInput({ label, hint, error, value = [], onChange, placeholder, max = 20 }) {
  const id = useId();
  const [draft, setDraft] = useState('');

  function commit(raw) {
    const next = raw.trim().replace(/,$/, '');
    if (!next || value.includes(next) || value.length >= max) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  }

  return (
    <Shell label={label} hint={hint} error={error} id={id}>
      <div className="flex flex-wrap gap-2 p-2 bg-surface-container-low rounded-lg border-2 border-transparent focus-within:ring-2 focus-within:ring-primary-container transition-all">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-inverse-surface text-white rounded-full text-xs font-bold"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              aria-label={`Remove ${tag}`}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(event) => {
            const next = event.target.value;
            if (next.endsWith(',')) commit(next);
            else setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(draft);
            } else if (event.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          className="flex-1 min-w-[8rem] bg-transparent border-none text-sm font-medium px-2 py-1 focus:outline-none focus:ring-0"
        />
      </div>
    </Shell>
  );
}

export function Checkbox({ label, className = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex items-center gap-3 cursor-pointer ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="w-5 h-5 rounded-md border-2 border-outline-variant text-primary focus:ring-2 focus:ring-primary-container cursor-pointer"
        {...props}
      />
      <span className="text-sm font-bold text-on-surface">{label}</span>
    </label>
  );
}

export function SubmitRow({ onCancel, submitting, submitLabel = 'Save', destructive }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      {destructive}
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-3 rounded-full font-bold text-sm text-on-surface hover:bg-surface-container transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="px-8 py-3 rounded-full bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 disabled:hover:scale-100"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
