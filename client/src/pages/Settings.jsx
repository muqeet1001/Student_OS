import React, { useEffect, useState } from 'react';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const field =
  'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-outline';

const HELP = [
  {
    q: 'How is my readiness score worked out?',
    a: 'Five components — skills, coding, resume, interview and projects — weighted so coding counts most, because it is the largest body of evidence and the slowest to move. Every point traces back to something you did.',
  },
  {
    q: 'What does a verified skill mean?',
    a: 'A skill you have passed an assessment on. Recruiters discount self-declared skills, so verified ones are what survive a shortlist filter. Nothing on this platform marks a skill verified without a passing attempt.',
  },
  {
    q: 'Why did my roadmap item tick itself?',
    a: 'Nothing on the roadmap is ticked by hand. Each item watches real evidence — a verified skill, a solved count, a submitted interview — so it completes when the work is done.',
  },
  {
    q: 'Who can see my profile?',
    a: 'Placement staff at your college can see your progress and skills so they can shortlist you. Other students cannot.',
  },
  {
    q: 'My interview slot clashes with another one.',
    a: 'Your calendar marks clashing entries in red. Contact the placement office — they can see the same clash on their side and move one of them.',
  },
  {
    q: 'I forgot my password.',
    a: 'Password reset needs email, which is not connected yet. Ask the placement office to reset it for you in the meantime.',
  },
];

function Section({ title, description, children }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5">
      <h2 className="font-headline text-base font-bold">{title}</h2>
      {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AccountForm({ user, onSaved }) {
  const [form, setForm] = useState({ name: user?.name ?? '', headline: user?.headline ?? '' });
  const [state, setState] = useState({ saving: false, message: '' });

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setState({ saving: true, message: '' });
    try {
      const { user: updated } = await api.patch('/profile/me/account', form);
      setState({ saving: false, message: 'Saved.' });
      // The endpoint returns the updated user, so the header and avatar
      // change immediately instead of waiting for the next page load.
      onSaved?.(updated);
    } catch (caught) {
      setState({ saving: false, message: caught.message || 'Could not save that.' });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={labelClass}>Name</span>
          <input value={form.name} onChange={update('name')} required className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelClass}>Email</span>
          <input
            value={user?.email ?? ''}
            disabled
            className={`${field} opacity-60 cursor-not-allowed`}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={labelClass}>Headline</span>
          <input
            value={form.headline}
            onChange={update('headline')}
            placeholder="Final-year CS student focused on backend systems"
            className={field}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state.saving}
          className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {state.saving ? 'Saving…' : 'Save changes'}
        </button>
        {state.message && <span className="text-xs text-on-surface-variant">{state.message}</span>}
      </div>

      <p className="text-[11px] text-outline">
        Email cannot be changed here — it identifies your account to the placement office.
      </p>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [state, setState] = useState({ saving: false, message: '', tone: 'muted' });

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();

    // Checked here as well as on the server so a typo costs a keystroke
    // rather than a round trip that reports the wrong field.
    if (form.newPassword !== form.confirm) {
      setState({ saving: false, message: 'The two new passwords do not match.', tone: 'error' });
      return;
    }

    setState({ saving: true, message: '', tone: 'muted' });
    try {
      await api.patch('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setState({
        saving: false,
        message: 'Password changed. Every other device has been signed out.',
        tone: 'ok',
      });
    } catch (caught) {
      setState({ saving: false, message: caught.message || 'Could not change it.', tone: 'error' });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className={labelClass}>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={update('currentPassword')}
            required
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelClass}>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.newPassword}
            onChange={update('newPassword')}
            required
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelClass}>Confirm new</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.confirm}
            onChange={update('confirm')}
            required
            className={field}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state.saving}
          className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {state.saving ? 'Changing…' : 'Change password'}
        </button>
        {state.message && (
          <span
            className={`text-xs font-bold ${
              state.tone === 'error'
                ? 'text-on-error-container'
                : state.tone === 'ok'
                  ? 'text-green-700'
                  : 'text-on-surface-variant'
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

function NotificationPreferences() {
  const { data, loading, error, refetch } = useApiResource('/auth/settings');
  const [choices, setChoices] = useState(null);
  const [saving, setSaving] = useState(false);

  // Seeded from the server once, then owned locally so a toggle responds
  // immediately rather than waiting for a round trip.
  useEffect(() => {
    if (data && !choices) setChoices(data.notifications);
  }, [data, choices]);

  if (loading && !data) return <p className="text-xs text-on-surface-variant">Loading…</p>;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;
  if (!choices) return null;

  async function toggle(key) {
    const next = { ...choices, [key]: !choices[key] };
    setChoices(next);
    setSaving(true);
    try {
      await api.patch('/auth/settings', { notifications: next });
    } catch {
      setChoices(choices);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ul className="space-y-2.5">
      {data.categories.map((category) => (
        <li key={category.key} className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={choices[category.key]}
            aria-label={category.label}
            onClick={() => toggle(category.key)}
            disabled={saving}
            className={`mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors relative ${
              choices[category.key] ? 'bg-primary' : 'bg-surface-container-high'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-[left] ${
                choices[category.key] ? 'left-[1.125rem]' : 'left-0.5'
              }`}
            />
          </button>

          <div className="min-w-0">
            <p className="text-sm font-bold">{category.label}</p>
            <p className="text-xs text-on-surface-variant">{category.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Sessions() {
  const { data, loading, error, refetch } = useApiResource('/auth/sessions');
  const [working, setWorking] = useState(false);

  if (loading && !data) return <p className="text-xs text-on-surface-variant">Loading…</p>;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;

  const sessions = data.sessions ?? [];
  const others = sessions.filter((session) => !session.current).length;

  async function revoke() {
    setWorking(true);
    try {
      await api.delete('/auth/sessions');
      refetch({ quiet: true });
    } catch (caught) {
      window.alert(caught.message || 'Could not sign those out.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{session.device}</p>
              <p className="text-xs text-on-surface-variant">
                {session.signedInAt
                  ? `Signed in ${new Date(session.signedInAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}`
                  : 'Signed in'}
              </p>
            </div>
            {session.current && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl bg-green-100 text-green-800 shrink-0">
                This device
              </span>
            )}
          </li>
        ))}
      </ul>

      {others > 0 && (
        <button
          type="button"
          onClick={revoke}
          disabled={working}
          className="px-5 py-2 rounded-lg bg-surface-container font-bold text-sm hover:bg-surface-container-high disabled:opacity-60"
        >
          {working ? 'Signing out…' : `Sign out ${others} other ${others === 1 ? 'device' : 'devices'}`}
        </button>
      )}
    </div>
  );
}

function JourneyPreferencesForm({ journey, onSaved }) {
  const [locale, setLocale] = useState(journey.locale);
  const [channels, setChannels] = useState({
    inApp: journey.channels?.inApp ?? true,
    email: journey.channels?.email ?? false,
    whatsapp: journey.channels?.whatsapp ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await api.patch('/journey/preferences', { locale, channels }); await onSaved(); }
    catch (error) { window.alert(error.message || 'Could not save communication settings.'); }
    finally { setSaving(false); }
  }

  async function changeConsent(key, granted) {
    try { await api.post('/journey/consents', { key, granted, source: 'settings' }); await onSaved(); }
    catch (error) { window.alert(error.message || 'Could not record that consent choice.'); }
  }

  const consents = Object.fromEntries((journey.consents ?? []).map((entry) => [entry.key, entry]));
  return <div className="space-y-4"><div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1"><span className={labelClass}>Language</span><select value={locale} onChange={(event) => setLocale(event.target.value)} className={field}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><div><p className={labelClass}>Reminder channels</p><div className="flex flex-wrap gap-3 mt-2">{[['inApp', 'In app'], ['email', 'Email'], ['whatsapp', 'WhatsApp']].map(([key, text]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={channels[key]} onChange={(event) => setChannels((current) => ({ ...current, [key]: event.target.checked }))} className="accent-primary" />{text}</label>)}</div></div></div><button type="button" disabled={saving} onClick={save} className="px-5 py-2 rounded-full bg-primary text-on-primary text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save preferences'}</button><div className="border-t border-outline-variant/60 pt-4"><p className={labelClass}>Consent history</p><div className="grid sm:grid-cols-2 gap-2 mt-2">{[['camera-proctoring', 'Camera proctoring'], ['public-profile', 'Public profile'], ['referrals', 'Referral discovery'], ['data-sharing', 'Readiness calculation']].map(([key, text]) => <label key={key} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3 text-sm font-bold"><span>{text}</span><input type="checkbox" checked={Boolean(consents[key]?.granted)} onChange={(event) => changeConsent(key, event.target.checked)} className="accent-primary" /></label>)}</div><details className="mt-3"><summary className="text-xs font-bold text-primary cursor-pointer">View recorded history ({journey.consentHistory?.length ?? 0})</summary><ul className="mt-2 space-y-1">{[...(journey.consentHistory ?? [])].reverse().slice(0, 20).map((entry) => <li key={entry._id} className="text-[11px] text-on-surface-variant">{entry.key}: {entry.granted ? 'granted' : 'declined'} · {new Date(entry.recordedAt).toLocaleString('en-IN')}</li>)}</ul></details></div></div>;
}

function JourneyPreferences() {
  const resource = useApiResource('/journey');
  if (resource.loading && !resource.data) return <LoadingBlock label="Loading privacy choices" />;
  if (resource.error && !resource.data) return <ErrorBlock error={resource.error} onRetry={resource.refetch} />;
  return <JourneyPreferencesForm key={resource.data.journey.updatedAt} journey={resource.data.journey} onSaved={() => resource.refetch({ quiet: true })} />;
}

/** Account, notifications, sessions and help. */
export default function Settings() {
  const { user, setUser } = useAuth();

  if (!user) return <LoadingBlock label="Loading settings" className="min-h-dvh" />;

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">Settings</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Your account, what you get told about, and where you are signed in.
          </p>
        </header>

        <Section title="Account">
          <AccountForm user={user} onSaved={setUser} />
        </Section>

        <Section
          title="Password"
          description="Changing it signs you out everywhere else, including any device you no longer have."
        >
          <PasswordForm />
        </Section>

        <Section
          title="Notifications"
          description="These appear on your dashboard. Turning one off hides that group entirely."
        >
          <NotificationPreferences />
        </Section>

        <Section
          title="Signed-in devices"
          description="If you do not recognise one of these, change your password."
        >
          <Sessions />
        </Section>

        <Section title="Language, reminders and consent" description="External channels activate only when your institution connects a provider. Every consent change is retained in your history.">
          <JourneyPreferences />
        </Section>

        <Section title="Help">
          <ul className="divide-y divide-outline-variant/60 -my-2">
            {HELP.map((item) => (
              <li key={item.q} className="py-2.5">
                <details className="group">
                  <summary className="text-sm font-bold cursor-pointer list-none flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-outline transition-transform group-open:rotate-90">
                      chevron_right
                    </span>
                    {item.q}
                  </summary>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-1.5 pl-6">
                    {item.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
