import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, api } from '../lib/api.js';

/**
 * Replaces a password the placement office issued.
 *
 * Signing in with a temporary password lands here, and every other route stays
 * closed until it is done — see ProtectedRoute. The officer who handed the
 * password over knows it, so it is a way in for exactly as long as it takes the
 * student to choose their own.
 *
 * Reachable without the app chrome on purpose: there is nothing else to do
 * first, and a navigation bar full of links that all bounce back here would be
 * noise rather than choice.
 */
export default function SetPassword() {
  const { user, adoptSession, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Nothing to replace, so the page has no purpose. Also stops a bookmark from
  // looking like a broken screen.
  if (!user?.mustChangePassword) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (form.newPassword !== form.confirm) {
      setFormError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      /*
       * No current password is sent. The one in hand was chosen by the office,
       * so the server does not treat it as proof of anything — and asking the
       * student to type it back would only encourage it to be written down.
       */
      const data = await api.patch('/auth/password', { newPassword: form.newPassword });
      adoptSession(data);
      navigate(data.user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Unable to reach the server. Please try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-on-surface flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-primary">key</span>
            <div>
              <h1 className="font-headline text-xl font-black tracking-tight">
                Choose your own password
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">
                The placement office gave you a temporary password for{' '}
                <span className="font-bold">{user.email}</span>. They have seen it, so replace it now —
                the rest of your workspace opens as soon as you do.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-error/20 bg-error-container/20 p-4"
              >
                <span className="material-symbols-outlined text-xl text-error">error</span>
                <p className="text-sm font-bold text-on-error-container">{formError}</p>
              </div>
            )}

            <FormField
              label="New password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters, with a number"
              required
              minLength={8}
              value={form.newPassword}
              onChange={update('newPassword')}
              error={fieldErrors.newPassword}
            />

            <FormField
              label="Confirm new password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Type it again"
              required
              minLength={8}
              value={form.confirm}
              onChange={update('confirm')}
              error={fieldErrors.confirm}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-5 py-3.5 font-extrabold text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save and continue'}
            </button>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Every other device is signed out when you save this — including whichever one the
              password was typed into first.
            </p>
          </form>
        </div>

        <button
          type="button"
          onClick={logout}
          className="mt-4 mx-auto block text-xs font-bold text-primary underline decoration-primary/30 underline-offset-4"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
