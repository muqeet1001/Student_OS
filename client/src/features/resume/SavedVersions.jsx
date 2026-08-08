import React from 'react';

/**
 * Saved resumes are frozen copies, so the list shows the score as it was at
 * save time rather than the current one.
 */
export default function SavedVersions({ versions, onSave, onDelete, saving }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-headline text-base font-bold">Saved versions</h3>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="text-primary font-bold text-sm flex items-center gap-1 hover:underline disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">bookmark_add</span>
          {saving ? 'Saving…' : 'Save current'}
        </button>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Save a version before tailoring your profile for a specific company — the saved copy keeps
          the content it had when you sent it.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => (
            <li
              key={version._id}
              className="flex items-center justify-between gap-3 p-3 bg-surface-container-low rounded-lg"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{version.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {version.targetCompany || version.targetRole || 'General'} •{' '}
                  {new Date(version.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-on-surface-variant">{version.atsScore}%</span>
                <button
                  type="button"
                  onClick={() => onDelete(version._id)}
                  aria-label={`Delete ${version.title}`}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-outline-variant hover:text-error hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
