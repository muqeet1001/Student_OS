import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Accessible dialog: closes on Escape and backdrop click, traps focus inside
 * while open, and restores focus to the trigger on close.
 */
export default function Modal({ open, onClose, title, description, children, size = 'md' }) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusable = () =>
      panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    focusable()[0]?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = Array.from(focusable());
      if (!items.length) return;

      const first = items[0];
      const last = items.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-neutral-900/40 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${widths[size]} max-h-[90vh] overflow-y-auto custom-scrollbar bg-surface-container-lowest rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]`}
      >
        <div className="sticky top-0 bg-surface-container-lowest px-6 sm:px-8 pt-6 pb-4 border-b border-outline-variant/60 flex items-start justify-between gap-3 z-10">
          <div>
            <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">{title}</h2>
            {description && <p className="text-sm text-on-surface-variant mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 sm:px-8 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
