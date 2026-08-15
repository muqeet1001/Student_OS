import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { api } from '../../lib/api.js';

export default function PublicProfileControls() {
  const { user } = useAuth();
  const { data, setData } = useApiResource('/profile/me');
  const [saving, setSaving] = useState(false);
  const settings = data?.profile?.publicProfile ?? { enabled: false, openToReferrals: false };
  const publicPath = `/public/${user?._id}`;

  async function update(next) {
    setSaving(true);
    try {
      const result = await api.patch('/profile/me', { publicProfile: { ...settings, ...next } });
      setData((current) => ({ ...current, profile: result.profile }));
    } catch (error) {
      window.alert(error.message || 'Could not update public profile settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Visibility and referrals</p>
          <h2 className="font-headline text-lg font-black mt-1">Public career profile</h2>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">Share verified skills, projects and achievements without exposing your phone number or email.</p>
        </div>
        {settings.enabled && <a href={publicPath} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-bold">View public profile</a>}
      </div>
      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3">
          <span><span className="block text-sm font-bold">Publish my profile</span><span className="block text-xs text-on-surface-variant">Off by default; you control when it becomes visible.</span></span>
          <input type="checkbox" checked={Boolean(settings.enabled)} disabled={saving} onChange={(event) => update({ enabled: event.target.checked })} className="w-5 h-5 accent-primary" />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3">
          <span><span className="block text-sm font-bold">Open to alumni referrals</span><span className="block text-xs text-on-surface-variant">Only available while your public profile is on.</span></span>
          <input type="checkbox" checked={Boolean(settings.openToReferrals)} disabled={saving || !settings.enabled} onChange={(event) => update({ openToReferrals: event.target.checked })} className="w-5 h-5 accent-primary" />
        </label>
      </div>
    </section>
  );
}
