import React from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const when = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Announcements from the placement office. */
export default function Inbox() {
  const { data, loading, error, refetch } = useApiResource('/announcements/me');

  if (loading && !data) return <LoadingBlock label="Loading your messages" className="min-h-dvh" />;
  if (error) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { announcements, unread } = data;

  async function open(announcement) {
    if (announcement.readAt) return;
    try {
      await api.post(`/announcements/${announcement._id}/read`);
      refetch({ quiet: true });
    } catch {
      // Marking as read is a convenience; failing to do so must not get in
      // the way of actually reading the message.
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            From the placement office
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {unread > 0
              ? `${unread} unread ${unread === 1 ? 'message' : 'messages'}.`
              : 'Drive notices, deadlines and anything else the office sends you.'}
          </p>
        </header>

        {announcements.length === 0 ? (
          <EmptyBlock
            icon="mail"
            title="No messages yet"
            description="Announcements from the placement office will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {announcements.map((announcement) => (
              <li key={announcement._id}>
                <details
                  onToggle={(event) => event.target.open && open(announcement)}
                  className={`bg-surface-container-lowest rounded-xl border p-4 ${
                    announcement.readAt ? 'border-outline-variant/60' : 'border-primary/40'
                  }`}
                >
                  <summary className="cursor-pointer list-none flex items-start gap-3">
                    {!announcement.readAt && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h2
                        className={`text-sm truncate ${
                          announcement.readAt ? 'font-bold' : 'font-black'
                        }`}
                      >
                        {announcement.subject}
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {announcement.from} · {when(announcement.sentAt)}
                      </p>
                    </div>
                  </summary>

                  <p className="text-sm text-on-surface-variant leading-relaxed mt-3 whitespace-pre-wrap">
                    {announcement.body}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
