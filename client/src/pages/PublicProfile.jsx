import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import Avatar from '../components/Avatar.jsx';
import { useApiResource } from '../hooks/useApiResource.js';

export default function PublicProfile() {
  const { userId } = useParams();
  const { data, loading, error, refetch } = useApiResource(`/profile/public/${userId}`);
  if (loading && !data) return <LoadingBlock label="Loading public profile" className="min-h-dvh" />;
  if (error && !data) return <div className="min-h-dvh p-6 max-w-3xl mx-auto"><ErrorBlock error={error} onRetry={refetch} /></div>;
  const { profile, user } = data;
  return (
    <main className="min-h-dvh bg-background text-on-surface px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="rounded-2xl bg-inverse-surface text-white p-6 md:p-8">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Avatar user={user} size={72} className="rounded-2xl" />
            <div><p className="text-xs uppercase tracking-[0.2em] font-bold opacity-60">Student OS verified profile</p><h1 className="font-headline text-3xl font-black mt-1">{user.name}</h1><p className="mt-1 opacity-80">{profile.headline || user.headline || 'Student professional'}</p><p className="text-sm mt-3 opacity-70 max-w-2xl">{profile.bio}</p></div>
          </div>
        </header>
        <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5"><h2 className="font-headline text-lg font-black">Verified skills</h2><div className="flex flex-wrap gap-2 mt-3">{profile.skills.filter((skill) => skill.verified).map((skill) => <span key={skill._id} className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">✓ {skill.name} · {skill.level}</span>)}{!profile.skills.some((skill) => skill.verified) && <p className="text-sm text-on-surface-variant">No verified skills published yet.</p>}</div></section>
        <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5"><h2 className="font-headline text-lg font-black">Projects</h2><div className="grid md:grid-cols-2 gap-3 mt-3">{profile.projects.map((project) => <article key={project._id} className="rounded-lg bg-surface-container-low p-4"><h3 className="font-bold">{project.title}</h3><p className="text-sm text-on-surface-variant mt-1">{project.description}</p><p className="text-xs text-primary font-bold mt-2">{project.techStack.join(' · ')}</p></article>)}</div></section>
        <div className="grid md:grid-cols-2 gap-4"><section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5"><h2 className="font-bold">Education</h2>{profile.education.map((item) => <div key={item._id} className="mt-3"><p className="text-sm font-bold">{item.degree} {item.fieldOfStudy}</p><p className="text-xs text-on-surface-variant">{item.institution} · {item.endYear || 'Present'}</p></div>)}</section><section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5"><h2 className="font-bold">Certificates & achievements</h2>{profile.certifications.map((item) => <div key={item._id} className="mt-3"><p className="text-sm font-bold">{item.title}</p><p className="text-xs text-on-surface-variant">{item.issuer}</p></div>)}</section></div>
        <footer className="flex flex-wrap gap-3 justify-between items-center"><div className="flex gap-3">{profile.links?.github && <a href={profile.links.github} className="text-sm font-bold text-primary">GitHub</a>}{profile.links?.linkedin && <a href={profile.links.linkedin} className="text-sm font-bold text-primary">LinkedIn</a>}</div><Link to="/" className="text-sm font-bold">Built with Student OS</Link></footer>
      </div>
    </main>
  );
}
