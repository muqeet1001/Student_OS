import React, { useRef, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import {
  CertificationForm,
  DetailsForm,
  EducationForm,
  ProjectForm,
  SkillForm,
} from '../features/profile/profileForms.jsx';

const SKILL_GROUPS = [
  { key: 'programming', label: 'Programming' },
  { key: 'frontend', label: 'Frontend & UI' },
  { key: 'backend', label: 'Backend' },
  { key: 'database', label: 'Database' },
  { key: 'cloud', label: 'Cloud & DevOps' },
  { key: 'soft', label: 'Soft skills' },
  { key: 'other', label: 'Other' },
];

const LEVEL_STYLES = {
  beginner: 'bg-surface-container text-on-surface-variant',
  intermediate: 'bg-secondary-container/40 text-on-secondary-container',
  advanced: 'bg-tertiary-container/40 text-on-tertiary-container',
  expert: 'bg-primary-container text-on-primary-container',
};

function SectionCard({ icon, title, action, children, className = '' }) {
  return (
    <section
      className={`bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4 min-w-0">
        <h3 className="text-base font-bold font-headline flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-primary shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, label = 'Add' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary font-bold text-sm flex items-center gap-1 hover:underline shrink-0"
    >
      <span className="material-symbols-outlined text-lg">add</span>
      {label}
    </button>
  );
}

function IconButton({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
        danger
          ? 'text-outline-variant hover:text-error hover:bg-error/10'
          : 'text-outline-variant hover:text-on-surface hover:bg-surface-container'
      }`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </button>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const { data, setData, loading, error, refetch } = useApiResource('/profile/me');
  const [dialog, setDialog] = useState(null); // { type, item }
  const [busy, setBusy] = useState(false);
  const avatarInputRef = useRef(null);

  const profile = data?.profile;
  const account = data?.user ?? user;

  /** Applies a server response that carries a fresh profile. */
  const applyProfile = (result) => {
    setData((current) => ({ ...current, profile: result.profile }));
  };

  const close = () => setDialog(null);

  async function saveDetails(payload) {
    const { name, ...profileFields } = payload;
    const [{ user: updatedUser }, { profile: updatedProfile }] = await Promise.all([
      api.patch('/profile/me/account', { name }),
      api.patch('/profile/me', profileFields),
    ]);
    setUser(updatedUser);
    setData({ profile: updatedProfile, user: updatedUser });
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const body = new FormData();
      body.append('avatar', file);
      const result = await api.post('/profile/me/avatar', body);
      setUser(result.user);
      setData((current) => ({ ...current, user: result.user }));
    } catch (uploadError) {
      window.alert(uploadError.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(section, itemId, confirmText) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      applyProfile(await api.delete(`/profile/me/${section}/${itemId}`));
    } catch (removeError) {
      window.alert(removeError.message || 'Could not remove that item.');
    } finally {
      setBusy(false);
    }
  }

  const submitFor = (section) => async (payload) => {
    const item = dialog?.item;
    const result = item
      ? await api.patch(`/profile/me/${section}/${item._id}`, payload)
      : await api.post(`/profile/me/${section}`, payload);
    applyProfile(result);
  };

  return (
    <div className="bg-surface text-on-surface min-h-dvh">

      <main className="pt-16 lg:pt-10 pb-10 px-5 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {loading && !profile && <LoadingBlock label="Loading profile" />}
          {error && !profile && <ErrorBlock error={error} onRetry={refetch} />}

          {profile && (
            <>
              <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3 mb-4">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                  <div className="relative group">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-surface-container-low shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                      <Avatar user={account} size={160} className="!rounded-full w-full h-full" />
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => avatarInputRef.current?.click()}
                      aria-label="Change profile photo"
                      className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.06)] transform transition-transform group-hover:scale-110 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                    </button>
                  </div>

                  <div className="text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                      {account?.name}
                    </h1>
                    <p className="text-lg font-medium text-stone-500 mb-4">
                      {profile.headline || 'Add a headline so recruiters know your focus.'}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      {profile.track && profile.track !== 'undecided' && (
                        <span className="px-4 py-1.5 bg-tertiary-container text-on-tertiary-container text-xs font-bold rounded-full tracking-wider uppercase">
                          {profile.track} Track
                        </span>
                      )}
                      {profile.graduationYear && (
                        <span className="px-4 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full tracking-wider uppercase">
                          Class of {profile.graduationYear}
                        </span>
                      )}
                      {profile.location && (
                        <span className="px-4 py-1.5 bg-surface-container text-on-surface-variant text-xs font-bold rounded-full tracking-wider uppercase">
                          {profile.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDialog({ type: 'details' })}
                  className="flex items-center gap-2 px-8 py-3 bg-inverse-surface text-surface rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                >
                  <span className="material-symbols-outlined text-sm">edit_square</span>
                  Edit Profile
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Skills */}
                <SectionCard
                  className="md:col-span-5"
                  icon="psychology"
                  title="Core Skills"
                  action={<AddButton onClick={() => setDialog({ type: 'skill' })} />}
                >
                  {profile.skills.length === 0 ? (
                    <EmptyBlock
                      icon="psychology"
                      title="No skills yet"
                      description="Add the languages, frameworks and soft skills you want to be hired for."
                    />
                  ) : (
                    <div className="space-y-4">
                      {SKILL_GROUPS.map((group) => {
                        const items = profile.skills.filter((skill) => skill.category === group.key);
                        if (!items.length) return null;

                        return (
                          <div key={group.key}>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                              {group.label}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {items.map((skill) => (
                                <span
                                  key={skill._id}
                                  className={`group pl-4 pr-2 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                                    LEVEL_STYLES[skill.level]
                                  }`}
                                >
                                  {skill.verified && (
                                    <span className="material-symbols-outlined text-sm" title="Verified by a skill test">
                                      verified
                                    </span>
                                  )}
                                  {skill.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeItem('skills', skill._id, `Remove ${skill.name} from your skills?`)
                                    }
                                    aria-label={`Remove ${skill.name}`}
                                    className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-100 hover:bg-black/10 transition-all"
                                  >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                {/* Projects */}
                <SectionCard
                  className="md:col-span-7"
                  icon="rocket_launch"
                  title="Projects"
                  action={<AddButton onClick={() => setDialog({ type: 'project' })} />}
                >
                  {profile.projects.length === 0 ? (
                    <EmptyBlock
                      icon="rocket_launch"
                      title="No projects yet"
                      description="Projects are the strongest signal on a student resume — add your best two."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profile.projects.map((project) => (
                        <article
                          key={project._id}
                          className="group bg-surface-container-low p-4 rounded-lg transition-all hover:bg-white hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:-translate-y-1"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                              <span className="material-symbols-outlined text-primary">data_object</span>
                            </div>
                            <div className="flex items-center">
                              {project.liveUrl && (
                                <a
                                  href={project.liveUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  title="Open live site"
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-outline-variant hover:text-on-surface"
                                >
                                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                                </a>
                              )}
                              {project.repoUrl && (
                                <a
                                  href={project.repoUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  title="Open repository"
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-outline-variant hover:text-on-surface"
                                >
                                  <span className="material-symbols-outlined text-lg">link</span>
                                </a>
                              )}
                              <IconButton
                                icon="edit"
                                label="Edit project"
                                onClick={() => setDialog({ type: 'project', item: project })}
                              />
                              <IconButton
                                icon="delete"
                                label="Delete project"
                                danger
                                onClick={() =>
                                  removeItem('projects', project._id, `Delete "${project.title}"?`)
                                }
                              />
                            </div>
                          </div>

                          <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                            {project.title}
                          </h4>
                          {project.description && (
                            <p className="text-stone-500 text-sm mb-4 line-clamp-3">{project.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            {project.techStack.map((tech) => (
                              <span
                                key={tech}
                                className="text-[10px] font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded-2xl uppercase"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Education */}
                <SectionCard
                  className="md:col-span-6"
                  icon="school"
                  title="Education"
                  action={<AddButton onClick={() => setDialog({ type: 'education' })} />}
                >
                  {profile.education.length === 0 ? (
                    <EmptyBlock icon="school" title="No education added" description="Add your degree and institution." />
                  ) : (
                    <ul className="space-y-4">
                      {profile.education.map((entry) => (
                        <li
                          key={entry._id}
                          className="flex items-start justify-between gap-3 p-4 bg-surface-container-low rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-on-surface">{entry.institution}</p>
                            <p className="text-sm text-on-surface-variant">
                              {[entry.degree, entry.fieldOfStudy].filter(Boolean).join(' • ')}
                            </p>
                            <p className="text-xs text-outline mt-1">
                              {[
                                [entry.startYear, entry.endYear].filter(Boolean).join(' — '),
                                entry.grade,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </p>
                          </div>
                          <div className="flex shrink-0">
                            <IconButton
                              icon="edit"
                              label="Edit education"
                              onClick={() => setDialog({ type: 'education', item: entry })}
                            />
                            <IconButton
                              icon="delete"
                              label="Delete education"
                              danger
                              onClick={() =>
                                removeItem('education', entry._id, `Remove ${entry.institution}?`)
                              }
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                {/* Certifications */}
                <SectionCard
                  className="md:col-span-6"
                  icon="workspace_premium"
                  title="Certifications"
                  action={<AddButton onClick={() => setDialog({ type: 'certification' })} />}
                >
                  {profile.certifications.length === 0 ? (
                    <EmptyBlock
                      icon="workspace_premium"
                      title="No certifications yet"
                      description="Cloud and platform certificates stand out on student profiles."
                    />
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.certifications.map((cert) => (
                        <li key={cert._id} className="p-4 bg-surface rounded-xl flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="material-symbols-outlined text-primary">verified</span>
                            <div className="flex shrink-0">
                              <IconButton
                                icon="edit"
                                label="Edit certification"
                                onClick={() => setDialog({ type: 'certification', item: cert })}
                              />
                              <IconButton
                                icon="delete"
                                label="Delete certification"
                                danger
                                onClick={() =>
                                  removeItem('certifications', cert._id, `Remove "${cert.title}"?`)
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <h5 className="font-bold text-sm">{cert.title}</h5>
                            {cert.issuer && <p className="text-xs text-on-surface-variant">{cert.issuer}</p>}
                            {cert.credentialId && (
                              <p className="text-[10px] text-stone-400 mt-1">ID: {cert.credentialId}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                {/* Completeness */}
                <section className="md:col-span-12 bg-primary text-white rounded-xl p-4 shadow-[0px_24px_48px_rgba(14,14,14,0.1)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Profile strength</h3>
                      <p className="text-white/70 text-sm max-w-md">
                        A complete profile feeds your readiness score and pre-fills your resume.
                      </p>
                    </div>
                    <div className="flex-1 max-w-md">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-3xl font-black">{profile.completeness}%</span>
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                          complete
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${profile.completeness}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>

      <Modal open={dialog?.type === 'details'} onClose={close} title="Edit profile" size="lg">
        <DetailsForm profile={profile} user={account} onSubmit={saveDetails} onCancel={close} />
      </Modal>

      <Modal open={dialog?.type === 'skill'} onClose={close} title="Add a skill" size="sm">
        <SkillForm onSubmit={submitFor('skills')} onCancel={close} />
      </Modal>

      <Modal
        open={dialog?.type === 'project'}
        onClose={close}
        title={dialog?.item ? 'Edit project' : 'Add a project'}
      >
        <ProjectForm initial={dialog?.item} onSubmit={submitFor('projects')} onCancel={close} />
      </Modal>

      <Modal
        open={dialog?.type === 'certification'}
        onClose={close}
        title={dialog?.item ? 'Edit certification' : 'Add a certification'}
      >
        <CertificationForm initial={dialog?.item} onSubmit={submitFor('certifications')} onCancel={close} />
      </Modal>

      <Modal
        open={dialog?.type === 'education'}
        onClose={close}
        title={dialog?.item ? 'Edit education' : 'Add education'}
      >
        <EducationForm initial={dialog?.item} onSubmit={submitFor('education')} onCancel={close} />
      </Modal>
    </div>
  );
}
