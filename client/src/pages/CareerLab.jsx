import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const TABS = [
  ['gap', 'Job skill-gap simulator'], ['mentor', 'AI career mentor'], ['github', 'GitHub analyzer'],
  ['readiness', 'Readiness simulator'], ['alumni', 'Alumni & referrals'],
];
const WEIGHTS = { skills: .2, coding: .3, resume: .2, interview: .2, projects: .1 };

function GapSimulator({ jobs }) {
  const [jobId, setJobId] = useState(jobs[0]?._id ?? '');
  const job = jobs.find((item) => item._id === jobId) ?? jobs[0];
  if (!job) return <p className="text-sm text-on-surface-variant">No open opportunities are available to simulate.</p>;
  const missing = job.match?.missing ?? [];
  return <div className="space-y-4"><label className="block"><span className="text-xs font-bold uppercase tracking-wider text-outline">Target opportunity</span><select value={job._id} onChange={(event) => setJobId(event.target.value)} className="block w-full mt-1 rounded-lg bg-surface-container-low border-0 px-4 py-3 font-bold">{jobs.map((item) => <option key={item._id} value={item._id}>{item.company} — {item.title}</option>)}</select></label><div className="grid md:grid-cols-3 gap-3"><div className="rounded-xl bg-inverse-surface text-white p-5"><p className="text-4xl font-black">{job.match?.score ?? 0}%</p><p className="text-xs uppercase tracking-wider opacity-70">Current job match</p></div><div className="md:col-span-2 rounded-xl bg-surface-container-low p-5"><h3 className="font-bold">Required vs existing skills</h3><div className="flex flex-wrap gap-2 mt-3">{(job.skills ?? []).map((skill) => { const absent = missing.some((item) => item.name === skill.name); return <span key={skill.name} className={`px-3 py-1.5 rounded-full text-xs font-bold ${absent ? 'bg-error-container/25 text-on-error-container' : 'bg-green-100 text-green-800'}`}>{absent ? 'Missing: ' : 'Ready: '}{skill.name}</span>; })}</div></div></div>{job.match?.blockers?.length > 0 && <div className="rounded-xl border border-error/20 bg-error-container/10 p-4"><h3 className="font-bold">Eligibility blockers</h3><ul className="list-disc ml-5 mt-2 text-sm">{job.match.blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}<div className="flex flex-wrap gap-2"><Link to={`/jobs/${job._id}`} className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold">Open opportunity</Link><Link to={`/resume-builder?job=${job._id}`} className="px-5 py-2.5 rounded-full bg-surface-container text-sm font-bold">Match resume to JD</Link></div></div>;
}

function CareerMentor() {
  const [message, setMessage] = useState('What should I focus on this week to improve my placement chances?');
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); try { setResult(await api.post('/career/mentor', { message })); } catch (error) { window.alert(error.message); } finally { setBusy(false); } }
  return <div className="space-y-4"><form onSubmit={submit} className="space-y-3"><label className="block"><span className="text-xs font-bold uppercase tracking-wider text-outline">Ask about your career preparation</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={3} maxLength={1000} rows={4} className="mt-1 w-full rounded-xl bg-surface-container-low border-0 p-4" /></label><button disabled={busy} className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold disabled:opacity-50">{busy ? 'Reviewing your evidence…' : 'Ask mentor'}</button></form>{result && <section className="rounded-xl bg-inverse-surface text-white p-5"><p className="text-xs font-bold uppercase tracking-wider opacity-60">{result.generated ? 'AI guidance grounded in your evidence' : 'Evidence-based mentor guidance'}</p><p className="mt-3 leading-relaxed">{result.answer}</p><div className="flex flex-wrap gap-2 mt-4">{result.actions.map((action) => <Link key={action.to} to={action.to} className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold">{action.label}</Link>)}</div></section>}</div>;
}

function GitHubAnalyzer() {
  const [repoUrl, setRepoUrl] = useState(''); const [analysis, setAnalysis] = useState(null); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); try { const result = await api.post('/career/github-analysis', { repoUrl }); setAnalysis(result.analysis); } catch (error) { window.alert(error.message); } finally { setBusy(false); } }
  return <div className="space-y-4"><form onSubmit={submit} className="flex flex-col sm:flex-row gap-2"><input type="url" required value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/owner/project" className="flex-1 rounded-full bg-surface-container-low border-0 px-4 py-3" /><button disabled={busy} className="px-5 py-3 rounded-full bg-primary text-on-primary text-sm font-bold">{busy ? 'Analyzing…' : 'Analyze project'}</button></form>{analysis && <><div className="grid md:grid-cols-3 gap-3"><div className="rounded-xl bg-inverse-surface text-white p-5"><p className="text-4xl font-black">{analysis.score}%</p><p className="text-xs uppercase tracking-wider opacity-70">Recruiter-ready project</p></div><div className="md:col-span-2 rounded-xl bg-surface-container-low p-5"><a href={analysis.repository.url} className="font-bold text-primary">{analysis.repository.fullName}</a><p className="text-sm text-on-surface-variant mt-1">{analysis.repository.description || 'No repository description.'}</p><p className="text-xs mt-3">{analysis.languages.join(' · ') || 'Languages unavailable'} · ★ {analysis.repository.stars} · {analysis.repository.forks} forks</p></div></div><ul className="space-y-2">{analysis.checks.map((check) => <li key={check.label} className="rounded-lg bg-surface-container-low p-3 flex gap-3"><span className={check.passed ? 'text-green-700' : 'text-error'}>{check.passed ? '✓' : '○'}</span><div><p className="text-sm font-bold">{check.label}</p>{!check.passed && <p className="text-xs text-on-surface-variant">{check.fix}</p>}</div><span className="ml-auto text-xs font-black">{check.passed ? `+${check.weight}` : `0/${check.weight}`}</span></li>)}</ul></>}</div>;
}

function ReadinessSimulator({ readiness }) {
  const [values, setValues] = useState({});
  const projected = Math.round(readiness.components.reduce((sum, item) => sum + (values[item.key] ?? item.value) * WEIGHTS[item.key], 0));
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-container-low p-5"><p className="text-3xl font-black">{readiness.score}%</p><p className="text-xs uppercase tracking-wider text-outline">Current readiness</p></div><div className="rounded-xl bg-inverse-surface text-white p-5"><p className="text-3xl font-black">{projected}%</p><p className="text-xs uppercase tracking-wider opacity-70">Simulated readiness</p></div></div>{readiness.components.map((item) => <label key={item.key} className="block rounded-lg bg-surface-container-low p-4"><span className="flex justify-between text-sm font-bold"><span>{item.label}</span><span>{values[item.key] ?? item.value}%</span></span><input type="range" min={item.value} max="100" value={values[item.key] ?? item.value} onChange={(event) => setValues((current) => ({ ...current, [item.key]: Number(event.target.value) }))} className="w-full mt-2 accent-primary" /></label>)}<p className="text-xs text-on-surface-variant">This is a planning simulation, not a guarantee of selection. Your real score changes only when Student OS records completed evidence.</p></div>;
}

function AlumniNetwork({ data }) {
  const alumni = data?.alumni ?? [];
  async function request(person) {
    const topic = window.prompt(`What would you like to discuss with ${person.name}?`, 'Preparing for my first placement interview');
    if (!topic?.trim()) return;
    try { await api.post('/journey/mentoring', { mentor: person.userId, mentorName: person.name, topic: topic.trim() }); window.alert('Mentoring request sent to the placement office for scheduling.'); }
    catch (error) { window.alert(error.message || 'Could not request mentoring.'); }
  }
  if (!alumni.length) return <div className="rounded-xl bg-surface-container-low p-5"><h3 className="font-bold">No alumni are currently open to referrals</h3><p className="text-sm text-on-surface-variant mt-1">Profiles appear only when placed alumni explicitly publish their profile and opt in to referrals.</p></div>;
  return <div className="grid md:grid-cols-2 gap-3">{alumni.map((person) => <article key={person.userId} className="rounded-xl bg-surface-container-low p-5"><p className="text-xs font-bold uppercase tracking-wider text-primary">{person.company}</p><h3 className="font-headline text-lg font-black mt-1">{person.name}</h3><p className="text-sm text-on-surface-variant">{person.role} · {person.branch}</p><div className="flex flex-wrap gap-1 mt-3">{person.skills.map((skill) => <span key={skill} className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">{skill}</span>)}</div><div className="flex flex-wrap gap-3 mt-4"><Link to={`/public/${person.userId}`} className="text-sm font-bold text-primary">View profile</Link>{person.linkedin && <a href={person.linkedin} target="_blank" rel="noreferrer" className="text-sm font-bold">LinkedIn</a>}<button type="button" onClick={() => request(person)} className="text-sm font-bold text-primary">Request mentoring</button></div></article>)}</div>;
}

export default function CareerLab() {
  const [tab, setTab] = useState('gap');
  const dashboard = useApiResource('/dashboard'); const jobs = useApiResource('/jobs?limit=50'); const alumni = useApiResource('/career/alumni');
  const error = dashboard.error || jobs.error || alumni.error;
  const loading = dashboard.loading || jobs.loading || alumni.loading;
  const title = useMemo(() => TABS.find(([key]) => key === tab)?.[1], [tab]);
  if (loading && !dashboard.data) return <LoadingBlock label="Opening career lab" className="min-h-dvh" />;
  if (error && !dashboard.data) return <div className="p-6"><ErrorBlock error={error} onRetry={dashboard.refetch} /></div>;
  return <main className="min-h-dvh bg-background text-on-surface"><div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Evidence-powered tools</p><h1 className="font-headline text-3xl font-black mt-1">Career Lab</h1><p className="text-sm text-on-surface-variant mt-1">Explore a decision, then turn it into real work in your plan.</p></header><div className="flex gap-2 overflow-x-auto pb-1" role="tablist">{TABS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${tab === key ? 'bg-inverse-surface text-white' : 'bg-surface-container'}`}>{label}</button>)}</div><section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 md:p-6"><h2 className="font-headline text-xl font-black mb-4">{title}</h2>{tab === 'gap' && <GapSimulator jobs={jobs.data?.jobs ?? []} />}{tab === 'mentor' && <CareerMentor />}{tab === 'github' && <GitHubAnalyzer />}{tab === 'readiness' && <ReadinessSimulator readiness={dashboard.data.readiness} />}{tab === 'alumni' && <AlumniNetwork data={alumni.data} />}</section></div></main>;
}
