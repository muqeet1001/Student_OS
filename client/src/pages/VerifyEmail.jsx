import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import AuthShowcase from '../components/AuthShowcase.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

/**
 * Confirms an email address from the link in the message.
 *
 * The token is spent by the POST this page makes, not by the page loading. That
 * distinction is the point: mail providers and security scanners routinely
 * fetch links before the recipient sees them, so a link that consumed its token
 * on GET would be dead before it was ever clicked.
 *
 * The request fires once, behind a ref. The token is single-use, so a second
 * attempt is refused — and React re-runs effects in development, which would
 * otherwise turn a successful confirmation into a visible failure.
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, adoptSession } = useAuth();

  const [state, setState] = useState(token ? 'working' : 'missing');
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;

    api
      .post('/auth/verify-email', { token })
      .then((data) => {
        // The address is on the user the response returns; `email` on this
        // payload is not a field at all, so reading it left this blank.
        setAddress(data.user?.email ?? '');
        setMessage(data.message ?? 'Your email address is confirmed.');
        setState('confirmed');

        /*
         * Refresh the signed-in user if this happens to be the account in the
         * browser, so a Settings row does not keep reading "not confirmed"
         * directly after the student confirmed it.
         */
        if (user && data.user && user._id === data.user._id) adoptSession({ user: data.user });
      })
      .catch((error) => {
        setMessage(
          error?.message || 'We could not confirm that address. The link may have expired.',
        );
        setState('failed');
      });
  }, [token, user, adoptSession]);

  const heading =
    state === 'confirmed' ? 'Address confirmed' : state === 'failed' ? 'Link not accepted' : 'Confirm your address';

  return (
    <div className="auth-page min-h-dvh bg-[#f2eee8] p-0 text-on-surface sm:p-3 lg:p-4">
      <div className="auth-frame mx-auto flex min-h-dvh w-full max-w-[154rem] flex-col overflow-hidden bg-white sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] lg:min-h-[calc(100dvh-2rem)] lg:flex-row">
        <AuthShowcase />

        <main className="relative flex w-full flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10 lg:w-[46%] lg:px-12 xl:px-16">
          <div className="w-full max-w-[35rem]">
            <div className="mb-8">
              <p className="mb-3 text-[0.7rem] font-extrabold uppercase tracking-[0.24em] text-primary">
                Email confirmation
              </p>
              <h2 className="font-headline text-4xl font-black leading-none tracking-[-0.055em] text-on-surface sm:text-5xl">
                {heading}
                <span className="text-primary">.</span>
              </h2>
            </div>

            <div className="space-y-5">
              {state === 'working' ? (
                <p
                  className="text-sm font-medium leading-relaxed text-on-surface-variant"
                  role="status"
                >
                  Checking your link…
                </p>
              ) : null}

              {state === 'missing' ? (
                <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
                  This page needs the link from your confirmation email. Open that link directly, or
                  ask for a new one from your settings once you are signed in.
                </p>
              ) : null}

              {state === 'confirmed' ? (
                <div className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                  <span className="material-symbols-outlined text-xl text-primary">
                    mark_email_read
                  </span>
                  <div>
                    <p className="text-sm font-bold leading-relaxed">{message}</p>
                    {address ? (
                      <p className="mt-1 text-xs font-medium leading-relaxed text-on-surface-variant">
                        Password recovery will use {address}.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {state === 'failed' ? (
                <div className="rounded-xl border border-error/20 bg-error-container/20 p-4">
                  <p className="text-sm font-bold text-on-error-container">{message}</p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-on-error-container/80">
                    Links can only be used once, and they expire. Ask for a new one and it will
                    arrive in the same place.
                  </p>
                </div>
              ) : null}

              {state === 'confirmed' ? (
                <Link
                  to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'}
                  className="group flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white px-5 py-4 text-base font-extrabold text-on-surface transition-all hover:border-primary/40 hover:bg-[#fff8f4]"
                >
                  <span>{user ? 'Back to Student OS' : 'Sign in'}</span>
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              ) : null}

              {state === 'failed' ? (
                <Link
                  to={user ? '/settings' : '/forgot-password'}
                  className="group flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white px-5 py-4 text-base font-extrabold text-on-surface transition-all hover:border-primary/40 hover:bg-[#fff8f4]"
                >
                  <span>{user ? 'Open settings' : 'Recover my account'}</span>
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
