import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api.js';

/**
 * The code to put on the projector.
 *
 * Polls because the code rotates: a static QR is photographed by the first
 * student in and forwarded to everyone still in bed. The countdown is drawn
 * locally between polls so the bar moves smoothly rather than jumping once
 * every few seconds.
 */
export default function CheckinCode({ kind, id, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [remaining, setRemaining] = useState(0);
  const canvasRef = useRef(null);

  const path = kind === 'training' ? `/trainings/${id}/checkin-code` : `/calendar/${id}/checkin-code`;

  const load = useCallback(async () => {
    try {
      const data = await api.get(path);
      setState({ loading: false, error: null, data });
      setRemaining(data.secondsRemaining);
    } catch (caught) {
      setState({ loading: false, error: caught.message || 'Could not get a code.', data: null });
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch as the current code dies, plus a moment of slack so the server
  // has definitely rolled over.
  useEffect(() => {
    if (!state.data) return undefined;
    const timer = setTimeout(load, Math.max(1, state.data.secondsRemaining) * 1000 + 400);
    return () => clearTimeout(timer);
  }, [state.data, load]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const tick = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(tick);
  }, [remaining]);

  // The QR carries a deep link, so a scan lands on the confirm screen with
  // the code already filled in — a student should not have to retype it.
  useEffect(() => {
    if (!state.data || !canvasRef.current) return;
    const url = `${window.location.origin}/check-in/${kind}/${id}?code=${state.data.code}`;
    QRCode.toCanvas(canvasRef.current, url, { width: 260, margin: 1 }, () => {});
  }, [state.data, kind, id]);

  if (state.loading) return <p className="text-xs text-on-surface-variant">Getting a code…</p>;
  if (state.error) return <p className="text-xs text-on-error-container">{state.error}</p>;

  const { code, window: checkinWindow, checkedIn, expected, periodSeconds } = state.data;

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant/60">
      {!checkinWindow.open ? (
        <p className="text-xs text-on-surface-variant">
          {checkinWindow.reason === 'not-yet'
            ? `Check-in opens at ${new Date(checkinWindow.opens).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`
            : 'Check-in for this session has closed.'}
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <canvas ref={canvasRef} className="rounded-lg shrink-0" />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Or type this code
            </p>
            {/*
              Tracking is what makes this readable from the back of a hall,
              but it is also what makes it overflow a narrow card. Scaled by
              container width rather than fixed at the largest size.
            */}
            <p className="font-headline text-2xl xl:text-3xl font-black tracking-[0.12em] xl:tracking-[0.18em] tabular-nums mt-1">
              {code}
            </p>

            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-1000 ease-linear"
                style={{ width: `${(remaining / periodSeconds) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-outline mt-1">
              Changes in {remaining}s — a photo of this is useless within a minute.
            </p>

            <p className="text-sm font-bold mt-3 tabular-nums">
              {checkedIn} of {expected} checked in
            </p>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-on-surface-variant hover:text-primary mt-2"
            >
              Hide code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
