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
      await login(form);
      // Send the visitor back to whatever they were trying to reach.
      const target = location.state?.from?.pathname || '/dashboard';
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
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-dvh flex items-center justify-center">
      <div className="flex w-full min-h-dvh overflow-hidden">
        <AuthShowcase />

        <main className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-surface-container-lowest">
          <div className="w-full max-w-md">
            <header className="mb-6 lg:hidden">
              <div className="flex items-center gap-2 mb-6">
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

            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-1.5">Welcome Back</h2>
              <p className="text-on-surface-variant font-medium">
                Enter your credentials to access your workspace.
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
                value={form.email}
                onChange={update('email')}
                error={fieldErrors.email}
              />

              <FormField
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={form.password}
                onChange={update('password')}
                error={fieldErrors.password}
              />

              <div className="pt-1 space-y-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-container text-on-primary-container font-bold py-3 px-5 rounded-full text-base shadow-[0px_12px_24px_rgba(255,120,78,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitting ? 'Signing in…' : 'Enter Workspace'}
                  <span className="material-symbols-outlined">
                    {submitting ? 'progress_activity' : 'arrow_forward'}
                  </span>
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-surface-container-highest" />
                  <span className="flex-shrink mx-4 text-outline text-xs font-bold uppercase tracking-widest">
                    New here?
                  </span>
                  <div className="flex-grow border-t border-surface-container-highest" />
                </div>

                <Link
                  to="/register"
                  className="w-full flex items-center justify-center py-3 px-5 rounded-full border-2 border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container transition-colors group"
                >
                  Create Account
                  <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">
                    person_add
                  </span>
                </Link>
              </div>
            </form>

            <footer className="mt-8 text-center">
              <p className="text-on-surface-variant text-sm font-medium">
                By continuing, you agree to our{' '}
                <a className="underline text-on-surface hover:text-primary transition-colors" href="#terms">
                  Terms of Service
                </a>
                .
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
