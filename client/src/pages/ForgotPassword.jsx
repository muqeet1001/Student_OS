import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';
import { ApiError, api } from '../lib/api.js';

/**
 * Starts a self-service reset.
 *
 * The screen has two honest outcomes. Either a link is on its way, or this
 * installation cannot send email at all — in which case it says so and points
 * at the placement office, which can issue a temporary password with nothing
 * configured. What it never does is claim a message was sent when it was not,
 * leaving the student waiting on something that is not coming.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      const data = await api.post('/auth/password/forgot', { email });
      setSent(data);
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

  const mailConfigured = sent?.email?.available === true;

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
                Forgotten password<span className="text-primary">.</span>
              </h2>
              <p className="mt-4 max-w-[30rem] text-sm font-medium leading-relaxed text-on-surface-variant sm:text-base">
                Give the address you signed up with and we will send a link to choose a new one.
              </p>
            </div>

            {sent ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                  <span className="material-symbols-outlined text-xl text-primary">
                    {mailConfigured ? 'mark_email_read' : 'info'}
                  </span>
                  <p className="text-sm font-bold leading-relaxed">{sent.message}</p>
                </div>

                {mailConfigured ? (
                  <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
                    The link works once and expires in {sent.expiresInMinutes} minutes. If it does not
                    arrive, check the spam folder before asking the placement office — they can issue a
                    temporary password instead.
                  </p>
                ) : (
                  /*
                   * The one case where the honest answer is "this will not
                   * work". Saying nothing here would leave the student
                   * refreshing an inbox that nothing can ever reach.
                   */
                  <div className="rounded-xl border border-error/20 bg-error-container/20 p-4">
                    <p className="text-sm font-bold text-on-error-container">
                      This installation has no email configured, so no link can be sent.
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-on-error-container/80">
                      {sent.email?.reason}
                    </p>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-on-error-container/80">
                      Ask the placement office to reset your password. They can issue a temporary one
                      from your student record, and you will be asked to replace it the next time you
                      sign in.
                    </p>
                  </div>
                )}

                <Link
                  to="/login"
                  className="group flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white px-5 py-4 text-base font-extrabold text-on-surface transition-all hover:border-primary/40 hover:bg-[#fff8f4]"
                >
                  <span>Back to sign in</span>
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
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
                    label="Email address"
                    name="email"
                    type="email"
                    icon="alternate_email"
                    autoComplete="email"
                    placeholder="you@college.edu"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFieldErrors({});
                      setFormError('');
                    }}
                    error={fieldErrors.email}
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex w-full items-center justify-between rounded-xl bg-primary px-5 py-4 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(217,74,18,0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-dim hover:shadow-[0_16px_36px_rgba(217,74,18,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>{submitting ? 'Sending…' : 'Send reset link'}</span>
                    <span
                      className={`material-symbols-outlined transition-transform ${
                        submitting ? 'animate-spin' : 'group-hover:translate-x-1'
                      }`}
                    >
                      {submitting ? 'progress_activity' : 'arrow_forward'}
                    </span>
                  </button>
                </form>

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-outline-variant/70" />
                  <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-outline">
                    Remembered it?
                  </span>
                  <div className="h-px flex-1 bg-outline-variant/70" />
                </div>

                <Link
                  to="/login"
                  className="group flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white px-5 py-4 text-base font-extrabold text-on-surface transition-all hover:border-primary/40 hover:bg-[#fff8f4]"
                >
                  <span>Back to sign in</span>
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:rotate-12">
                    login
                  </span>
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
