import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../lib/api.js';
import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
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
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      const signedInUser = await login(form);
      const target =
        location.state?.from?.pathname || (signedInUser.role === 'admin' ? '/admin' : '/dashboard');
      navigate(target, { replace: true });
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
                Your workspace is ready
              </p>
              <h2 className="font-headline text-4xl font-black leading-none tracking-[-0.055em] text-on-surface sm:text-5xl">
                Welcome back<span className="text-primary">.</span>
              </h2>
              <p className="mt-4 max-w-[30rem] text-sm font-medium leading-relaxed text-on-surface-variant sm:text-base">
                Sign in to keep building momentum toward your next opportunity.
              </p>
            </div>

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
                value={form.email}
                onChange={update('email')}
                error={fieldErrors.email}
              />

              <FormField
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                value={form.password}
                onChange={update('password')}
                error={fieldErrors.password}
              />

              <label className="flex w-fit cursor-pointer items-center gap-3 text-sm font-semibold text-on-surface-variant">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded border-outline-variant accent-primary"
                />
                Keep me signed in on this device
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-between rounded-xl bg-primary px-5 py-4 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(217,74,18,0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-dim hover:shadow-[0_16px_36px_rgba(217,74,18,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{submitting ? 'Opening workspace…' : 'Enter workspace'}</span>
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
                New to Student OS?
              </span>
              <div className="h-px flex-1 bg-outline-variant/70" />
            </div>

            <Link
              to="/register"
              className="group flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white px-5 py-4 text-base font-extrabold text-on-surface transition-all hover:border-primary/40 hover:bg-[#fff8f4]"
            >
              <span>Create your account</span>
              <span className="material-symbols-outlined text-primary transition-transform group-hover:rotate-12">
                person_add
              </span>
            </Link>

            <p className="mt-7 text-center text-xs font-medium leading-relaxed text-outline">
              By continuing, you agree to our{' '}
              <a className="underline decoration-outline-variant underline-offset-4 hover:text-primary" href="#terms">
                Terms of Service
              </a>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
