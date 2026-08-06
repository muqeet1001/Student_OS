import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../lib/api.js';
import AuthShowcase from '../components/AuthShowcase.jsx';
import FormField from '../components/FormField.jsx';

/** Mirrors the server's password policy so users get feedback before submit. */
function scorePassword(password) {
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Contains a letter', passed: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', passed: /[0-9]/.test(password) },
  ];
  return { checks, passed: checks.filter((c) => c.passed).length };
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
    <div className="bg-surface text-on-surface min-h-dvh flex items-center justify-center">
      <div className="flex w-full min-h-dvh overflow-hidden">
        <AuthShowcase />

        <main className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-surface-container-lowest">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h2 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">
                Create your account
              </h2>
              <p className="text-on-surface-variant font-medium">
                Start tracking your placement readiness in minutes.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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
                label="Full Name"
                name="name"
                icon="badge"
                autoComplete="name"
                placeholder="Arjun Malhotra"
                required
                value={form.name}
                onChange={update('name')}
                error={fieldErrors.name}
              />

              <FormField
                label="Email Address"
                name="email"
                type="email"
                icon="alternate_email"
                autoComplete="email"
                placeholder="hello@studentos.com"
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
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={update('password')}
                  error={fieldErrors.password}
                />

                {form.password && (
                  <ul className="grid gap-1.5 px-1">
                    {strength.checks.map((check) => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-2 text-xs font-bold ${
                          check.passed ? 'text-green-700' : 'text-on-surface-variant'
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
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                error={fieldErrors.confirmPassword}
              />

              <div className="pt-4 space-y-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-container text-on-primary-container font-bold py-4 px-6 rounded-full text-lg shadow-[0px_12px_24px_rgba(255,120,78,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitting ? 'Creating account…' : 'Create Account'}
                  <span className="material-symbols-outlined">
                    {submitting ? 'progress_activity' : 'person_add'}
                  </span>
                </button>

                <p className="text-center text-on-surface-variant font-medium text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-primary hover:text-primary-dim">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
