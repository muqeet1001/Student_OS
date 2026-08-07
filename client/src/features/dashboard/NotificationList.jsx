import React from 'react';
import { Link } from 'react-router-dom';

const TONES = {
  warning: {
    wrap: 'bg-secondary-container/40 border-secondary-fixed',
    icon: 'text-on-secondary-container',
  },
  success: {
    wrap: 'bg-green-50 border-green-200',
    icon: 'text-green-700',
  },
  info: {
    wrap: 'bg-surface-container-lowest border-outline-variant/15',
    icon: 'text-primary',
  },
};

export default function NotificationList({ notifications = [] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-5 text-center">
        <span className="material-symbols-outlined text-green-600 text-2xl">task_alt</span>
        <p className="text-sm font-bold mt-1">Nothing needs your attention</p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          You are on top of everything right now.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {notifications.map((notice) => {
        const tone = TONES[notice.tone] ?? TONES.info;

        return (
          <li key={notice.id}>
            <Link
              to={notice.action.to}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors hover:border-primary/30 ${tone.wrap}`}
            >
              <span className={`material-symbols-outlined text-xl shrink-0 ${tone.icon}`}>
                {notice.icon}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface">{notice.title}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{notice.body}</p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-2">
                  {notice.action.label}
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
