import React, { useState } from 'react';
import { api } from '../../lib/api.js';

/**
 * Readiness only means something against a goal — 65% is strong for a data
 * analyst and weak for a backend engineer. Picking a role turns the whole
 * dashboard from a report card into a gap list.
 */
export default function TargetRole({ targetRole, availableRoles, onChange }) {
  const [saving, setSaving] = useState(false);

  async function select(key) {
    setSaving(true);
    try {
      const result = await api.patch('/dashboard/target-role', { targetRole: key });
      onChange(result.targetRole);
    } catch (error) {
      window.alert(error.message || 'Could not set that role.');
    } finally {
      setSaving(false);
    }
  }

  if (!targetRole) {
    return (
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
          Target role
        </h2>
        <p className="text-sm text-on-surface-variant mt-1.5 mb-3">
          Pick what you're aiming for and every score below is measured against it.
        </p>

        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role) => (
            <button
              key={role.key}
              type="button"
              disabled={saving}
              onClick={() => select(role.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-sm font-bold transition-colors disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base text-primary">{role.icon}</span>
              {role.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const all = [...targetRole.required, ...targetRole.preferred];

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Target role
          </h2>
          <p className="font-headline text-base font-bold mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-primary">
              {targetRole.role.icon}
            </span>
            {targetRole.role.label}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-black tabular-nums leading-none">{targetRole.score}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-0.5">
            match
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
        {all.map((skill) => (
          <li key={skill.name} className="flex items-center gap-1.5 text-xs min-w-0">
            <span
              className={`material-symbols-outlined text-sm shrink-0 ${
                skill.has ? 'text-green-600' : 'text-outline-variant'
              }`}
              style={skill.has ? { fontVariationSettings: '"FILL" 1' } : undefined}
            >
              {skill.has ? 'check_circle' : 'cancel'}
            </span>
            <span className={`truncate ${skill.has ? 'font-bold' : 'text-on-surface-variant'}`}>
              {skill.name}
            </span>
            {skill.verified && (
              <span className="text-[9px] font-black uppercase text-green-700 shrink-0">✓</span>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChange(null)}
        className="text-xs font-bold text-on-surface-variant hover:text-primary"
      >
        Change role
      </button>
    </section>
  );
}
