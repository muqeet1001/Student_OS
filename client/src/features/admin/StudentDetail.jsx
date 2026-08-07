import React from 'react';
import Modal from '../../components/Modal.jsx';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1.5 border-b border-outline-variant/10 last:border-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-black uppercase tracking-wider text-outline mb-2">{title}</h3>
      {children}
    </section>
  );
}

export default function StudentDetail({ student, onClose }) {
  const { data, loading, error, refetch } = useApiResource(`/admin/students/${student._id}`);

  const profile = data?.profile;

  return (
    <Modal
      open
      onClose={onClose}
      title={student.name}
      description={student.email}
      size="lg"
    >
      {loading && <LoadingBlock label="Loading student" />}
      {error && <ErrorBlock error={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-5">
          {/* Readiness breakdown, using the row already loaded by the table. */}
          <Section title="Readiness breakdown">
            <div className="space-y-2">
              {Object.entries(student.components).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-on-surface-variant capitalize">{key}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Profile">
            <Row label="Headline" value={profile?.headline || '—'} />
            <Row label="Branch" value={profile?.branch || '—'} />
            <Row label="Graduating" value={profile?.graduationYear || '—'} />
            <Row label="Target roles" value={profile?.targetRoles?.join(', ') || '—'} />
            <Row label="Projects" value={profile?.projects?.length ?? 0} />
          </Section>

          <Section title="Recent accepted solutions">
            {data.recentSubmissions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No accepted submissions yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.recentSubmissions.map((submission) => (
                  <li
                    key={submission._id}
                    className="flex items-center justify-between gap-3 text-sm px-3 py-2 bg-surface-container-low rounded-lg"
                  >
                    <span className="font-bold truncate">{submission.problem?.title}</span>
                    <span className="text-xs text-on-surface-variant shrink-0">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Test attempts">
            {data.attempts.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No tests taken yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.attempts.map((attempt) => (
                  <li
                    key={attempt._id}
                    className="flex items-center justify-between gap-3 text-sm px-3 py-2 bg-surface-container-low rounded-lg"
                  >
                    <span className="font-bold truncate">{attempt.test?.title}</span>
                    <span
                      className={`text-xs font-black shrink-0 ${
                        attempt.passed ? 'text-green-700' : 'text-error'
                      }`}
                    >
                      {attempt.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Mock interviews">
            {data.interviews.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No interviews completed yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.interviews.map((session) => (
                  <li
                    key={session._id}
                    className="flex items-center justify-between gap-3 text-sm px-3 py-2 bg-surface-container-low rounded-lg"
                  >
                    <span className="font-bold capitalize truncate">
                      {session.round.replace('-', ' ')}
                    </span>
                    <span className="text-xs font-black shrink-0">{session.overallScore}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </Modal>
  );
}
