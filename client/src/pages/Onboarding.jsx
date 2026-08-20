import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

const ROLES = [
  ['software-engineer', 'Software engineer'], ['frontend', 'Frontend engineer'],
  ['backend', 'Backend engineer'], ['fullstack', 'Full-stack engineer'], ['data-analyst', 'Data analyst'],
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ targetRole: 'software-engineer', graduationYear: new Date().getFullYear() + 1, branch: '', placementDate: `${new Date().getFullYear() + 1}-05-01`, weeklyGoal: 5, companies: '', cameraConsent: false, dataConsent: true });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  async function finish() {
    setBusy(true); setError('');
    try {
      await api.put('/journey/onboarding', {
        targetRole: form.targetRole, graduationYear: Number(form.graduationYear), branch: form.branch,
        placementDate: form.placementDate, weeklyGoal: Number(form.weeklyGoal),
        targetCompanies: form.companies.split(',').map((value) => value.trim()).filter(Boolean),
        consents: [{ key: 'camera-proctoring', granted: form.cameraConsent }, { key: 'data-sharing', granted: form.dataConsent }],
      });
      navigate('/dashboard', { replace: true });
    } catch (caught) { setError(caught.message || 'Could not save your starting plan.'); }
    finally { setBusy(false); }
  }

  const field = 'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
  return <main className="min-h-dvh bg-background text-on-surface flex items-center justify-center p-5"><section className="w-full max-w-2xl rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 md:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Step {step + 1} of 3</p><div className="h-1.5 rounded-full bg-surface-container mt-3 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
    {step === 0 && <div className="mt-6 space-y-4"><div><h1 className="font-headline text-2xl font-black">What are you preparing for?</h1><p className="text-sm text-on-surface-variant mt-1">This sets the evidence and coding targets used by your readiness plan.</p></div><label className="block text-sm font-bold">Target role<select className={`${field} mt-1`} value={form.targetRole} onChange={set('targetRole')}>{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="grid sm:grid-cols-2 gap-3"><label className="text-sm font-bold">Graduation year<input className={`${field} mt-1`} type="number" min="1950" max="2100" value={form.graduationYear} onChange={set('graduationYear')} /></label><label className="text-sm font-bold">Department / branch<input className={`${field} mt-1`} required value={form.branch} onChange={set('branch')} placeholder="Computer Science" /></label></div><label className="block text-sm font-bold">Target companies, separated by commas<input className={`${field} mt-1`} value={form.companies} onChange={set('companies')} placeholder="TCS, Infosys, Amazon" /></label></div>}
    {step === 1 && <div className="mt-6 space-y-4"><div><h1 className="font-headline text-2xl font-black">Set a realistic rhythm</h1><p className="text-sm text-on-surface-variant mt-1">Your baseline is captured from real evidence after setup—never from a self-reported score.</p></div><label className="block text-sm font-bold">Placement season date<input className={`${field} mt-1`} type="date" value={form.placementDate} onChange={set('placementDate')} /></label><label className="block text-sm font-bold">Actions per week: {form.weeklyGoal}<input className="w-full mt-3 accent-primary" type="range" min="1" max="20" value={form.weeklyGoal} onChange={set('weeklyGoal')} /></label><div className="rounded-xl bg-surface-container-low p-4 text-sm"><p className="font-bold">Your first-week baseline</p><p className="text-on-surface-variant mt-1">Complete your profile, one role-relevant skill check and one short practice test. Student OS will show exactly which evidence moved your score.</p></div></div>}
    {step === 2 && <div className="mt-6 space-y-4"><div><h1 className="font-headline text-2xl font-black">Your data, your choice</h1><p className="text-sm text-on-surface-variant mt-1">Every choice is recorded in consent history and can be changed later.</p></div><label className="flex gap-3 rounded-xl border border-outline-variant/60 p-4"><input type="checkbox" checked={form.cameraConsent} onChange={set('cameraConsent')} className="accent-primary" /><span><span className="block text-sm font-bold">Camera-assisted test proctoring</span><span className="block text-xs text-on-surface-variant mt-1">Processed on this device. Non-proctored practice remains available.</span></span></label><label className="flex gap-3 rounded-xl border border-outline-variant/60 p-4"><input type="checkbox" checked={form.dataConsent} onChange={set('dataConsent')} className="accent-primary" /><span><span className="block text-sm font-bold">Use my activity to calculate readiness</span><span className="block text-xs text-on-surface-variant mt-1">Required for a personalized plan. The score always links back to its evidence.</span></span></label></div>}
    {error && <p className="mt-4 text-sm text-error">{error}</p>}<div className="flex justify-between gap-3 mt-7"><button type="button" disabled={step === 0 || busy} onClick={() => setStep((value) => value - 1)} className="px-5 py-2.5 rounded-full font-bold text-sm disabled:opacity-30">Back</button>{step < 2 ? <button type="button" disabled={step === 0 && !form.branch.trim()} onClick={() => setStep((value) => value + 1)} className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm disabled:opacity-50">Continue</button> : <button type="button" disabled={busy || !form.dataConsent} onClick={finish} className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm disabled:opacity-50">{busy ? 'Building plan…' : 'Build my plan'}</button>}</div>
  </section></main>;
}
