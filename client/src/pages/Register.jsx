import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../lib/api.js';
import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';

/** Mirrors the server's password policy so users get feedback before submit. */
function scorePassword(password) {
  const checks = [
    { label: '8+ characters', passed: password.length >= 8 },
    { label: 'One letter', passed: /[a-zA-Z]/.test(password) },
    { label: 'One number', passed: /[0-9]/.test(password) },
  ];
  return { checks, passed: checks.filter((check) => check.passed).length };
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/dashboard', { replace: true });
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

        <main className="relative flex w-full flex-1 items-center justify-center bg-white px-6 py-9 sm:px-10 lg:w-[46%] lg:px-12 xl:px-16">
          <span className="absolute right-7 top-7 hidden font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-outline lg:block">
            02 / Create
          </span>

          <div className="w-full max-w-[35rem]">
            <div className="mb-6">
              <p className="mb-3 text-[0.7rem] font-extrabold uppercase tracking-[0.24em] text-primary">
                Build your career system
              </p>
              <h2 className="font-headline text-4xl font-black leading-none tracking-[-0.055em] text-on-surface sm:text-5xl">
                Start moving<span className="text-primary">.</span>
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
                Create your workspace and turn every week into visible progress.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
                label="Full name"
                name="name"
                icon="badge"
                autoComplete="name"
                placeholder="Your full name"
                required
                value={form.name}
                onChange={update('name')}
                error={fieldErrors.name}
              />

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

              <div className="space-y-3">
                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  required
                  value={form.password}
                  onChange={update('password')}
                  error={fieldErrors.password}
                />

                {form.password && (
                  <ul className="grid grid-cols-3 gap-2 px-1">
                    {strength.checks.map((check) => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-[0.68rem] font-extrabold ${
                          check.passed ? 'text-primary' : 'text-outline'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {check.passed ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        {check.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <FormField
                label="Confirm password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                required
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                error={fieldErrors.confirmPassword}
              />

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-between rounded-xl bg-primary px-5 py-4 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(217,74,18,0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-dim active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{submitting ? 'Creating your workspace…' : 'Create my workspace'}</span>
                <span
                  className={`material-symbols-outlined transition-transform ${
                    submitting ? 'animate-spin' : 'group-hover:translate-x-1'
                  }`}
                >
                  {submitting ? 'progress_activity' : 'arrow_forward'}
                </span>
              </button>

              <p className="pt-1 text-center text-sm font-medium text-on-surface-variant">
                Already have an account?{' '}
                <Link className="font-extrabold text-primary hover:text-primary-dim" to="/login">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
