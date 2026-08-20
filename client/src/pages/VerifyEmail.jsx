import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import AuthShowcase from '../components/AuthShowcase.jsx';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const { user, setUser, isAuthenticated } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'idle'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(emailParam || user?.email || '');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token || !emailParam) {
      setStatus('idle');
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const response = await api.post('/auth/verify-email', {
          token,
          email: emailParam,
        });

        if (isMounted) {
          setStatus('success');
          setMessage(response.message || 'Email verified successfully.');
          setUser((current) =>
            current && current.email === emailParam ? { ...current, isVerified: true } : current,
          );
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setMessage(error.message || 'Verification link is invalid or has expired.');
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, emailParam, setUser]);

  async function handleResend(event) {
    event.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail });
      setResendSuccess(true);
    } catch (error) {
      window.alert(error.message || 'Could not send verification email.');
    } finally {
      setResending(false);
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

            {status === 'loading' && (
              <div className="text-center py-10 space-y-4">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                  progress_activity
                </span>
                <h2 className="text-2xl font-extrabold text-on-surface">Verifying Your Email</h2>
                <p className="text-on-surface-variant text-sm font-medium">
                  Validating your token and activating your credentials…
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-6">
                <div className="w-14 h-14 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">verified</span>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-2">Email Confirmed</h2>
                  <p className="text-on-surface-variant font-medium leading-relaxed">
                    {message || 'Your email address has been verified. Your account is ready for full access.'}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="w-full bg-primary text-on-primary font-bold py-3 px-5 rounded-full text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    {isAuthenticated ? 'Enter Workspace' : 'Sign In to Your Account'}
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>
            )}

            {(status === 'error' || status === 'idle') && (
              <div className="space-y-6">
                <div className="w-14 h-14 bg-error-container/20 text-error rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">
                    {status === 'error' ? 'error' : 'mail'}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-2">
                    {status === 'error' ? 'Verification Failed' : 'Verify Your Email'}
                  </h2>
                  <p className="text-on-surface-variant font-medium">
                    {status === 'error'
                      ? message || 'The verification link is invalid or has expired.'
                      : 'Please check your inbox or request a new verification email below.'}
                  </p>
                </div>

                {resendSuccess ? (
                  <div className="p-4 rounded-xl bg-primary-container/20 border border-primary/20 space-y-2">
                    <p className="font-bold text-sm text-on-surface">New verification link sent!</p>
                    <p className="text-xs text-on-surface-variant">
                      Please check your inbox at <span className="font-bold">{resendEmail}</span>.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleResend} className="space-y-3 pt-1">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-outline mb-1 block">
                        Email Address
                      </span>
                      <input
                        type="email"
                        required
                        value={resendEmail}
                        onChange={(event) => setResendEmail(event.target.value)}
                        placeholder="your-email@studentos.com"
                        className="w-full rounded-xl bg-surface-container-low border-0 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={resending || !resendEmail}
                      className="w-full bg-primary-container text-on-primary-container font-bold py-3 px-5 rounded-full text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60"
                    >
                      {resending ? 'Sending…' : 'Resend Verification Link'}
                      <span className="material-symbols-outlined text-base">send</span>
                    </button>
                  </form>
                )}

                <div className="pt-2">
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="w-full flex items-center justify-center py-3 px-5 rounded-full border-2 border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container transition-colors text-sm"
                  >
                    {isAuthenticated ? 'Back to Dashboard' : 'Back to Sign In'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
