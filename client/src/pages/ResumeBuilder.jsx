import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource.js';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { api } from '../lib/api.js';
import ResumePreview from '../features/resume/ResumePreview.jsx';
import SavedVersions from '../features/resume/SavedVersions.jsx';

const SCORE_TONES = [
  { min: 80, label: 'Strong', className: 'text-green-700 bg-green-100' },
  { min: 55, label: 'Needs work', className: 'text-on-secondary-container bg-secondary-container/50' },
  { min: 0, label: 'Weak', className: 'text-on-error-container bg-error-container/25' },
];

export default function ResumeBuilder() {
  // The score is computed server-side so a saved version and the live
  // preview can never disagree about the same profile.
  const { data, setData, loading, error, refetch } = useApiResource('/resumes/builder');
  const [accent, setAccent] = useState('#a83206');
  const [saving, setSaving] = useState(false);

  const profile = data?.profile;
  const account = data?.user;
  const report = data?.report;
  const versions = data?.versions ?? [];

  const tone = report ? SCORE_TONES.find((item) => report.score >= item.min) : null;

  async function saveVersion() {
    const title = window.prompt('Name this version', `Resume ${versions.length + 1}`);
    if (!title?.trim()) return;

    setSaving(true);
    try {
      const { resume } = await api.post('/resumes', { title: title.trim(), accent });
      setData((current) => ({ ...current, versions: [resume, ...current.versions] }));
    } catch (caught) {
      window.alert(caught.message || 'Could not save that version.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteVersion(id) {
    if (!window.confirm('Delete this saved version?')) return;
    try {
      await api.delete(`/resumes/${id}`);
      setData((current) => ({
        ...current,
        versions: current.versions.filter((item) => item._id !== id),
      }));
    } catch (caught) {
      window.alert(caught.message || 'Could not delete that version.');
    }
  }

  if (loading && !profile) return <LoadingBlock label="Loading your resume" className="min-h-dvh" />;
  if (error && !profile) {
    return (
      <div className="p-6 pt-20 lg:pt-8">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface">
      {/* Screen-only toolbar; print output is the resume alone. */}
      <div className="print:hidden px-5 pt-20 lg:pt-8 md:px-8 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[110rem] mx-auto">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Editorial resume</p>
          <h1 className="font-headline text-3xl font-black tracking-tight mt-1">Resume Builder</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low rounded-full px-4 py-2">
            <label htmlFor="accent" className="text-xs font-bold uppercase tracking-wider text-outline">
              Accent
            </label>
            <input
              id="accent"
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              className="w-8 h-8 rounded-full border-none bg-transparent cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-8 py-3 rounded-full bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base align-middle mr-1">download</span>
            Download PDF
          </button>
        </div>
      </div>

      <div className="max-w-[110rem] mx-auto px-5 md:px-8 pb-12 grid grid-cols-12 gap-5">
        {/* ATS panel */}
        <aside className="print:hidden col-span-12 xl:col-span-4 space-y-6">
          {report && (
            <>
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <h2 className="font-headline text-lg font-bold">ATS score</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${tone.className}`}>
                    {tone.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-black font-headline">{report.score}</span>
                  <span className="text-xl font-bold text-on-surface-variant">/ 100</span>
                </div>

                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${report.score}%`, background: accent }}
                  />
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
                <h3 className="font-headline text-base font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">checklist</span>
                  Checks
                </h3>
                <ul className="space-y-3">
                  {report.checks.map((check) => (
                    <li key={check.label} className="flex items-start gap-3">
                      <span
                        className={`material-symbols-outlined text-lg shrink-0 ${
                          check.passed ? 'text-green-600' : 'text-outline-variant'
                        }`}
                        style={check.passed ? { fontVariationSettings: '"FILL" 1' } : undefined}
                      >
                        {check.passed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <div>
                        <p
                          className={`text-sm font-bold ${
                            check.passed ? 'text-on-surface' : 'text-on-surface-variant'
                          }`}
                        >
                          {check.label}
                        </p>
                        {!check.passed && check.fix && (
                          <p className="text-xs text-on-surface-variant mt-0.5">{check.fix}</p>
                        )}
                      </div>
                      <span className="ml-auto text-xs font-black text-outline shrink-0">
                        {check.passed ? `+${check.weight}` : `0/${check.weight}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-tertiary-container/20 rounded-xl p-6 border border-tertiary-container/30">
                <p className="text-sm text-on-tertiary-container leading-relaxed">
                  Your resume is generated from your profile, so it never falls out of sync.{' '}
                  <Link to="/profile" className="font-bold underline">
                    Edit your profile
                  </Link>{' '}
                  and the preview updates instantly.
                </p>
              </div>
            </>
          )}

          <SavedVersions
            versions={versions}
            saving={saving}
            onSave={saveVersion}
            onDelete={deleteVersion}
          />
        </aside>

        {/* Live preview */}
        <section className="col-span-12 xl:col-span-8 flex justify-center items-start">
          {report && report.score === 0 ? (
            <EmptyBlock
              icon="description"
              title="Your profile is empty"
              description="Add your details, education and a project or two, and your resume will build itself."
              action={
                <Link
                  to="/profile"
                  className="px-6 py-3 rounded-full bg-primary text-on-primary font-bold text-sm"
                >
                  Go to profile
                </Link>
              }
              className="w-full bg-surface-container-lowest"
            />
          ) : (
            <ResumePreview profile={profile} user={account} accent={accent} />
          )}
        </section>
      </div>
    </div>
  );
}
