import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token || !email) {
      setFormError('This password reset link is invalid or incomplete. Please request a new one.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      await api.post('/auth/reset-password', {
        email,
        token,
        newPassword: form.newPassword,
      });
      setCompleted(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Unable to reach the server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-dvh flex items-center justify-center">
      <div className="flex w-full min-h-dvh overflow-hidden">
        <AuthShowcase />

        <main className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-surface-container-lowest">
          <div className="w-full max-w-md">
            <header className="mb-4 lg:hidden">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-on-primary">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    rocket_launch
                  </span>
                </span>
                <span className="text-xl font-black tracking-tighter text-on-surface font-headline">
                  Student OS
                </span>
              </div>
            </header>

            {!token || !email ? (
              <div className="space-y-6">
                <div className="w-14 h-14 bg-error-container/20 text-error rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">error</span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-2">Invalid Recovery Link</h2>
                  <p className="text-on-surface-variant font-medium">
                    This password reset link is missing required parameters or has expired.
                  </p>
                </div>
                <Link
                  to="/forgot-password"
                  className="w-full bg-primary text-on-primary font-bold py-3 px-5 rounded-full text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Request a New Link
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            ) : completed ? (
              <div className="space-y-6">
                <div className="w-14 h-14 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-2">Password Updated</h2>
                  <p className="text-on-surface-variant font-medium">
                    Your password has been changed successfully. All previous sessions have been signed out for security.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full bg-primary text-on-primary font-bold py-3 px-5 rounded-full text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Sign In with New Password
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-1.5">Choose a New Password</h2>
                  <p className="text-on-surface-variant font-medium">
                    Resetting password for <span className="font-bold text-on-surface">{email}</span>.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  {formError && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 p-4 rounded-lg bg-error-container/15 border border-error/20"
                    >
                      <span className="material-symbols-outlined text-error text-xl">error</span>
                      <p className="text-sm font-bold text-on-error-container">{formError}</p>
                    </div>
                  )}

                  <FormField
                    label="New Password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters (letter + number)"
                    required
                    value={form.newPassword}
                    onChange={update('newPassword')}
                    error={fieldErrors.newPassword}
                  />

                  <FormField
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    required
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    error={fieldErrors.confirmPassword}
                  />

                  <div className="pt-2 space-y-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary text-on-primary font-bold py-3 px-5 rounded-full text-base shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Updating Password…' : 'Set New Password'}
                      <span className="material-symbols-outlined text-base">
                        {submitting ? 'progress_activity' : 'lock'}
                      </span>
                    </button>

                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center py-3 px-5 rounded-full border-2 border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container transition-colors"
                    >
                      Cancel and Return to Sign In
                    </Link>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
