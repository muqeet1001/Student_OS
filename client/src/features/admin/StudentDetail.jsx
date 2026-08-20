import React from 'react';
import Modal from '../../components/Modal.jsx';
import { ErrorBlock, LoadingBlock } from '../../components/StateBlocks.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1.5 border-b border-outline-variant/60 last:border-0">
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

const shortDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';
const money = (value) => value ? `₹${(value / 100000).toFixed(1)} LPA` : 'Not reported';

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
        <div className="space-y-3">
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
            <Row label="CGPA" value={profile?.cgpa ?? profile?.education?.[0]?.grade ?? '—'} />
            <Row label="Target roles" value={profile?.targetRoles?.join(', ') || '—'} />
            <Row label="Projects" value={profile?.projects?.length ?? 0} />
            <Row label="Certifications" value={profile?.certifications?.length ?? 0} />
            <Row label="Profile updated" value={shortDate(profile?.updatedAt)} />
          </Section>

          <Section title="Verified evidence">
            <div className="flex flex-wrap gap-1.5">
              {(profile?.skills ?? []).filter((skill) => skill.verified).map((skill) => <span key={skill._id} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800"><span className="material-symbols-outlined text-sm">verified</span>{skill.name}</span>)}
              {!(profile?.skills ?? []).some((skill) => skill.verified) && <p className="text-sm text-on-surface-variant">No verified skills yet.</p>}
            </div>
            {(profile?.projects ?? []).length > 0 && <ul className="mt-3 space-y-1">{profile.projects.map((project) => <li key={project._id} className="rounded-lg bg-surface-container-low px-3 py-2"><p className="text-sm font-bold">{project.title}</p><p className="text-xs text-on-surface-variant">{project.techStack?.join(' · ') || 'Technology not listed'}</p></li>)}</ul>}
          </Section>

          <Section title="Resume and documents">
            <div className="grid sm:grid-cols-2 gap-2">
              {(data.resumes ?? []).map((resume) => <div key={resume._id} className="rounded-lg bg-surface-container-low p-3"><p className="text-sm font-bold">{resume.title}</p><p className="text-xs text-on-surface-variant mt-1">ATS {resume.atsScore}% · {shortDate(resume.updatedAt)}</p></div>)}
              {(data.documents ?? []).map((document) => <div key={document._id} className="rounded-lg bg-surface-container-low p-3"><p className="text-sm font-bold">{document.title}</p><p className="text-xs text-on-surface-variant mt-1 capitalize">{document.kind.replace('-', ' ')} · {document.status}</p></div>)}
            </div>
            {!data.resumes?.length && !data.documents?.length && <p className="text-sm text-on-surface-variant">No resume versions or documents submitted.</p>}
          </Section>

          <Section title="Placement pipeline">
            <div className="space-y-1.5">
              {(data.pipeline ?? []).map((item) => <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"><div className="min-w-0"><p className="text-sm font-bold truncate">{item.company} · {item.role}</p><p className="text-xs text-on-surface-variant">{shortDate(item.driveDate)}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">{item.candidate?.stage?.replaceAll('-', ' ')}</span></div>)}
              {(data.applications ?? []).map((item) => <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"><p className="text-sm font-bold truncate">{item.job?.company} · {item.job?.title}</p><span className="text-[10px] font-black uppercase text-on-surface-variant">{item.stage}</span></div>)}
              {!data.pipeline?.length && !data.applications?.length && <p className="text-sm text-on-surface-variant">No active placement pipeline history.</p>}
            </div>
          </Section>

          <Section title="Offers and joining">
            {(data.offers ?? []).length === 0 ? <p className="text-sm text-on-surface-variant">No offers recorded.</p> : <ul className="space-y-1.5">{data.offers.map((offer) => <li key={offer._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"><div><p className="text-sm font-bold">{offer.company} · {offer.role}</p><p className="text-xs text-on-surface-variant">{money(offer.ctc)} · Joining {shortDate(offer.joiningDate)}</p></div><span className="text-[10px] font-black uppercase text-primary">{offer.status}</span></li>)}</ul>}
          </Section>

          <Section title="Officer actions">
            {(data.actions ?? []).length === 0 ? <p className="text-sm text-on-surface-variant">No officer actions assigned.</p> : <ul className="space-y-1.5">{data.actions.map((action) => <li key={action._id} className="rounded-lg bg-surface-container-low px-3 py-2"><div className="flex justify-between gap-2"><p className="text-sm font-bold">{action.title}</p><span className="text-[10px] font-black uppercase">{action.status}</span></div><p className="text-xs text-on-surface-variant mt-0.5">{action.staffOwner?.name || action.assignedBy?.name || 'Placement office'} · Due {shortDate(action.dueAt)}</p></li>)}</ul>}
          </Section>

          <Section title="Recent accepted solutions">
            {data.recentSolves.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No accepted submissions yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.recentSolves.map((solve) => (
                  <li
                    key={solve._id}
                    className="flex items-center justify-between gap-3 text-sm px-3 py-2 bg-surface-container-low rounded-lg"
                  >
                    <span className="font-bold truncate">{solve.problem?.title}</span>
                    <span className="text-xs text-on-surface-variant shrink-0">
                      {new Date(solve.solvedAt).toLocaleDateString()}
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
                    <span className="min-w-0">
                      <span className="font-bold truncate block">{attempt.test?.title}</span>
                      {attempt.status === 'disqualified' && (
                        <span className="text-[11px] text-error block truncate">
                          Disqualified after {attempt.proctoring?.warningCount || 2} warnings
                          {attempt.proctoring?.reason ? ` · ${attempt.proctoring.reason}` : ''}
                        </span>
                      )}
                    </span>
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
