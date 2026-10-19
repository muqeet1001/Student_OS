import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, api } from '../lib/api.js';

/**
 * Completes a self-service reset, from the link in the email.
 *
 * The token travels in the query string because that is what an emailed link
 * can carry; it is spent on the first submission, so opening the page twice
 * does not leave a usable credential lying around in a browser history.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { adoptSession } = useAuth();

  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    // Checked here as well as on the server, so a typo costs a keystroke rather
    // than a round trip that can only report it after the token is spent.
    if (form.newPassword !== form.confirm) {
      setFormError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post('/auth/password/reset', {
        token,
        newPassword: form.newPassword,
      });
      // The server signs the student straight in, so there is nothing to type
      // twice. They have just proved control of the mailbox.
      const user = adoptSession(data);
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
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

  const missingToken = !token;

  return (
    <div className="auth-page min-h-dvh bg-[#f2eee8] p-0 text-on-surface sm:p-3 lg:p-4">
      <div className="auth-frame mx-auto flex min-h-dvh w-full max-w-[154rem] flex-col overflow-hidden bg-white sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] lg:min-h-[calc(100dvh-2rem)] lg:flex-row">
        <AuthShowcase />

        <main className="relative flex w-full flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10 lg:w-[46%] lg:px-12 xl:px-16">
          <span className="absolute right-7 top-7 hidden font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-outline lg:block">
            01 / Access
          </span>

          <div className="w-full max-w-[35rem]">
            <div className="mb-8">
              <p className="mb-3 text-[0.7rem] font-extrabold uppercase tracking-[0.24em] text-primary">
                Account recovery
              </p>
              <h2 className="font-headline text-4xl font-black leading-none tracking-[-0.055em] text-on-surface sm:text-5xl">
                Choose a new password<span className="text-primary">.</span>
              </h2>
              <p className="mt-4 max-w-[30rem] text-sm font-medium leading-relaxed text-on-surface-variant sm:text-base">
                Signing in with it ends every session that is currently open, on any device.
              </p>
            </div>

            {missingToken ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-error/20 bg-error-container/20 p-4">
                  <span className="material-symbols-outlined text-xl text-error">link_off</span>
                  <p className="text-sm font-bold text-on-error-container">
                    This link is missing its token. Open the link from your email again, or request a
                    new one.
                  </p>
                </div>

                <Link
                  to="/forgot-password"
                  className="group flex w-full items-center justify-between rounded-xl bg-primary px-5 py-4 text-base font-extrabold text-white transition-all hover:bg-primary-dim"
                >
                  <span>Request a new link</span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
                    className="group flex w-full items-center justify-between rounded-xl bg-primary px-5 py-4 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(217,74,18,0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-dim hover:shadow-[0_16px_36px_rgba(217,74,18,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>{submitting ? 'Setting it…' : 'Set password and sign in'}</span>
                    <span
                      className={`material-symbols-outlined transition-transform ${
                        submitting ? 'animate-spin' : 'group-hover:translate-x-1'
                      }`}
                    >
                      {submitting ? 'progress_activity' : 'arrow_forward'}
                    </span>
                  </button>
                </form>

                <p className="mt-7 text-center text-xs font-medium leading-relaxed text-outline">
                  Link expired?{' '}
                  <Link
                    to="/forgot-password"
                    className="font-bold text-primary underline decoration-primary/30 underline-offset-4"
                  >
                    Request a new one
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
