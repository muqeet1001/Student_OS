import React from 'react';

function formatRange(start, end, current) {
  const year = (value) => (value ? new Date(value).getFullYear() : null);
  const from = year(start);
  const to = current ? 'Present' : year(end);
  if (!from && !to) return '';
  return [from, to].filter(Boolean).join(' — ');
}

function Section({ title, accent, children }) {
  return (
    <section>
      <h3
        className="text-[10px] font-label font-bold mb-3 uppercase tracking-[0.2em]"
        style={{ color: accent }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * The printable resume. Sized to A4 and driven entirely by the profile, so it
 * cannot drift out of sync with what the student has entered.
 */
export default function ResumePreview({ profile, user, accent = '#a83206' }) {
  const contact = [user?.email, profile.phone, profile.location].filter(Boolean);
  const links = Object.entries(profile.links ?? {}).filter(([, value]) => value);

  return (
    <div
      id="resume-sheet"
      className="w-full max-w-[820px] bg-white shadow-2xl rounded-sm p-10 md:p-12 flex flex-col gap-7 relative overflow-hidden print:shadow-none print:rounded-none print:p-0"
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-bl-full print:hidden"
        style={{ background: `${accent}1a` }}
      />

      <header
        className="flex flex-wrap justify-between items-end gap-4 pb-6 border-b-2"
        style={{ borderColor: `${accent}33` }}
      >
        <div className="min-w-0">
          <h1 className="font-headline text-4xl font-black text-neutral-900 leading-tight uppercase">
            {user?.name || 'Your Name'}
          </h1>
          {profile.headline && (
            <p
              className="font-bold tracking-widest text-sm uppercase mt-1"
              style={{ color: accent }}
            >
              {profile.headline}
            </p>
          )}
        </div>

        <div className="text-right text-xs text-neutral-500 space-y-1 shrink-0">
          {contact.map((item) => (
            <p key={item}>{item}</p>
          ))}
          {links.map(([key, value]) => (
            <p key={key} className="truncate max-w-[16rem]">
              {value.replace(/^https?:\/\//, '')}
            </p>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-7">
        {profile.bio && (
          <Section title="Profile" accent={accent}>
            <p className="text-sm text-neutral-600 leading-relaxed">{profile.bio}</p>
          </Section>
        )}

        {profile.experience?.length > 0 && (
          <Section title="Experience" accent={accent}>
            <div className="space-y-4">
              {profile.experience.map((entry) => (
                <div key={entry._id} className="relative pl-5">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: accent }}
                  />
                  <div className="flex justify-between items-baseline gap-3">
                    <h4 className="font-bold text-neutral-900 text-sm">{entry.role}</h4>
                    <span className="text-[10px] font-bold text-neutral-400 shrink-0">
                      {formatRange(entry.startDate, entry.endDate, entry.current)}
                    </span>
                  </div>
                  {entry.company && (
                    <p className="text-xs font-semibold text-neutral-500 italic mb-1.5">
                      {entry.company}
                    </p>
                  )}
                  {entry.highlights?.length > 0 && (
                    <ul className="text-[11px] text-neutral-600 space-y-1 list-disc list-outside ml-4">
                      {entry.highlights.map((highlight, index) => (
                        <li key={index}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {profile.projects?.length > 0 && (
          <Section title="Projects" accent={accent}>
            <div className="space-y-3">
              {profile.projects.map((project) => (
                <div key={project._id}>
                  <div className="flex justify-between items-baseline gap-3">
                    <h4 className="font-bold text-neutral-900 text-sm">{project.title}</h4>
                    {project.techStack?.length > 0 && (
                      <span className="text-[10px] font-bold text-neutral-400 shrink-0 truncate max-w-[14rem]">
                        {project.techStack.join(' · ')}
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-[11px] text-neutral-600 leading-relaxed mt-0.5">
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="grid grid-cols-2 gap-10">
          {profile.education?.length > 0 && (
            <Section title="Education" accent={accent}>
              <div className="space-y-3">
                {profile.education.map((entry) => (
                  <div key={entry._id}>
                    <h4 className="font-bold text-neutral-900 text-[11px]">
                      {[entry.degree, entry.fieldOfStudy].filter(Boolean).join(', ') ||
                        entry.institution}
                    </h4>
                    <p className="text-[10px] text-neutral-500">
                      {entry.degree || entry.fieldOfStudy ? entry.institution : ''}
                      {entry.endYear ? ` • ${entry.endYear}` : ''}
                      {entry.grade ? ` • ${entry.grade}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {profile.skills?.length > 0 && (
            <Section title="Expertise" accent={accent}>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {profile.skills.map((skill) => (
                  <span key={skill._id} className="text-[11px] font-bold text-neutral-700">
                    • {skill.name}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {profile.certifications?.length > 0 && (
          <Section title="Certifications" accent={accent}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {profile.certifications.map((cert) => (
                <span key={cert._id} className="text-[11px] text-neutral-700">
                  <span className="font-bold">{cert.title}</span>
                  {cert.issuer && <span className="text-neutral-500"> — {cert.issuer}</span>}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
