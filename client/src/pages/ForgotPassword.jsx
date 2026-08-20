import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
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

            {submitted ? (
              <div className="space-y-6">
                <div className="w-14 h-14 bg-primary-container/20 text-primary rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">mail</span>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-2">Check Your Email</h2>
                  <p className="text-on-surface-variant font-medium leading-relaxed">
                    If an account is associated with <span className="font-bold text-on-surface">{email}</span>,
                    we have dispatched password reset instructions. The link is active for 1 hour.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Link
                    to="/login"
                    className="w-full bg-primary text-on-primary font-bold py-3 px-5 rounded-full text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    Return to Sign In
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }}
                    className="w-full text-center py-2 text-sm font-bold text-outline hover:text-on-surface transition-colors"
                  >
                    Try another email address
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-1.5">Reset Password</h2>
                  <p className="text-on-surface-variant font-medium">
                    Enter the email registered with your Student OS account to receive a secure recovery link.
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
                    label="Email Address"
                    name="email"
                    type="email"
                    icon="alternate_email"
                    autoComplete="email"
                    placeholder="hello@studentos.com"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFieldErrors({});
                      setFormError('');
                    }}
                    error={fieldErrors.email}
                  />

                  <div className="pt-2 space-y-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary-container text-on-primary-container font-bold py-3 px-5 rounded-full text-base shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Sending instructions…' : 'Send Recovery Link'}
                      <span className="material-symbols-outlined text-base">
                        {submitting ? 'progress_activity' : 'send'}
                      </span>
                    </button>

                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center py-3 px-5 rounded-full border-2 border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container transition-colors gap-2"
                    >
                      <span className="material-symbols-outlined text-base">arrow_back</span>
                      Back to Sign In
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
