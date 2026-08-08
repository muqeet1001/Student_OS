import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

/**
 * Where a scanned QR lands.
 *
 * The code arrives in the query string, so a scan submits itself and the
 * student sees a result rather than a form. Typing it by hand is the
 * fallback for a camera that will not focus in a dim hall.
 */
export default function CheckIn() {
  const { kind, id } = useParams();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [state, setState] = useState({ status: 'idle', message: '' });
  const submitted = useRef(false);

  const path = kind === 'training' ? `/trainings/${id}/checkin` : `/calendar/${id}/checkin`;

  async function send(value) {
    setState({ status: 'sending', message: '' });
    try {
      const data = await api.post(path, { code: value.trim().toUpperCase() });
      setState({
        status: 'ok',
        message: data.message,
        title: data.title,
        alreadyIn: data.alreadyIn,
      });
    } catch (caught) {
      setState({ status: 'error', message: caught.message || 'Could not check you in.' });
    }
  }

  // A scan should not need a second tap. Guarded so React's development
  // double-render does not fire two check-ins.
  useEffect(() => {
    const scanned = params.get('code');
    if (scanned && !submitted.current) {
      submitted.current = true;
      send(scanned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = state.status === 'ok';

  return (
    <div className="bg-background text-on-surface min-h-dvh flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        {ok ? (
          <>
            <span
              className="material-symbols-outlined text-5xl text-green-600"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              check_circle
            </span>
            <h1 className="font-headline text-xl font-black mt-2">{state.message}</h1>
            {state.title && <p className="text-sm text-on-surface-variant mt-1">{state.title}</p>}
          </>
        ) : (
          <>
            <h1 className="font-headline text-xl font-black">Check in</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Enter the code on the screen. It changes every few seconds, so use the one showing
              now.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(code);
              }}
              className="mt-5 space-y-3"
            >
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                // Uppercase, wide tracking: this is read off a projector at
                // the back of a hall and typed on a phone.
                className="w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-3 text-center font-headline text-2xl font-black tracking-[0.2em] uppercase focus:outline-none focus:ring-2 focus:ring-primary-container"
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-label="Check-in code"
                required
              />

              <button
                type="submit"
                disabled={state.status === 'sending'}
                className="w-full px-6 py-3 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
              >
                {state.status === 'sending' ? 'Checking in…' : 'Check in'}
              </button>
            </form>

            {state.status === 'error' && (
              <p className="text-xs font-bold text-on-error-container mt-3">{state.message}</p>
            )}
          </>
        )}

        <Link
          to="/calendar"
          className="inline-block text-xs font-bold text-on-surface-variant hover:text-primary mt-6"
        >
          Back to your calendar
        </Link>
      </div>
    </div>
  );
}
