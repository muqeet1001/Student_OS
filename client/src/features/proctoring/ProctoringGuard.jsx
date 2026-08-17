import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

const MODEL_PATH = '/mediapipe/models/blaze_face_short_range.tflite';
const WASM_PATH = '/mediapipe/wasm';
const DETECTION_INTERVAL_MS = 700;

const STATUS_COPY = {
  idle: 'Camera permission is required before the timer starts.',
  loading: 'Loading the on-device face detector…',
  calibrating: 'Keep one face visible and look towards the screen.',
  ready: 'Camera and face detection are active.',
  error: 'Proctoring could not start.',
};

/**
 * Camera frames stay inside this component. MediaPipe runs in the browser and
 * the API receives only a violation type, timestamp and random event id.
 */
export default function ProctoringGuard({
  attemptId,
  endpoint,
  active = true,
  initialWarnings = 0,
  onReady,
  onDisqualified,
  onCancel,
}) {
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState(initialWarnings);
  const [notice, setNotice] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const phaseRef = useRef(phase);
  const attemptRef = useRef(attemptId);
  const endpointRef = useRef(endpoint);
  const activeRef = useRef(active);
  const warningOpenRef = useRef(false);
  const readySentRef = useRef(false);
  const inferenceRef = useRef(false);
  const calibrationFramesRef = useRef(0);
  const conditionSinceRef = useRef(new Map());
  const lastReportedRef = useRef(new Map());

  phaseRef.current = phase;
  attemptRef.current = attemptId;
  endpointRef.current = endpoint;
  activeRef.current = active;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current?.close?.();
    detectorRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!active && phase === 'ready') stop();
  }, [active, phase, stop]);

  const attachVideo = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const report = useCallback(
    async (type, detail = '') => {
      if (!attemptRef.current || !endpointRef.current || warningOpenRef.current) return;

      const now = Date.now();
      const last = lastReportedRef.current.get(type) ?? 0;
      if (now - last < 20_000) return;
      lastReportedRef.current.set(type, now);

      try {
        const data = await api.post(endpointRef.current(attemptRef.current), {
          eventId: crypto.randomUUID(),
          type,
          occurredAt: new Date().toISOString(),
          detail,
        });

        setWarnings(data.warningCount);
        warningOpenRef.current = true;
        setNotice({ message: data.message, disqualified: data.disqualified });

        if (data.disqualified) {
          stop();
          onDisqualified?.(data.result);
        }
      } catch (caught) {
        // A reporting outage must be visible. Silently ignoring it would make
        // the monitoring badge promise enforcement that did not happen.
        setError(caught.message || 'The proctoring event could not be recorded.');
      }
    },
    [onDisqualified, stop],
  );

  const observe = useCallback(
    (type, present, requiredMs, detail) => {
      const conditions = conditionSinceRef.current;
      if (!present) {
        conditions.delete(type);
        return;
      }

      const started = conditions.get(type) ?? Date.now();
      conditions.set(type, started);
      if (Date.now() - started >= requiredMs) {
        conditions.delete(type);
        report(type, detail);
      }
    },
    [report],
  );

  const start = useCallback(async () => {
    stop();
    setError('');
    setPhase('loading');
    readySentRef.current = false;
    calibrationFramesRef.current = 0;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error('Camera preview is unavailable.');
      video.srcObject = stream;
      await video.play();

      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      detectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.65,
      });

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (activeRef.current && phaseRef.current === 'ready') {
          report('camera-stopped', 'The active camera track ended.');
        }
      });

      setPhase('calibrating');
    } catch (caught) {
      stop();
      setError(
        caught.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access to take this assessment.'
          : caught.message || 'Camera setup failed.',
      );
      setPhase('error');
    }
  }, [report, stop]);

  // Run face inference at a bounded rate instead of on every animation frame.
  useEffect(() => {
    if (!['calibrating', 'ready'].includes(phase)) return undefined;

    const timer = setInterval(async () => {
      const detector = detectorRef.current;
      const video = videoRef.current;
      if (!detector || !video || video.readyState < 2 || inferenceRef.current) return;

      inferenceRef.current = true;
      try {
        const result = detector.detectForVideo(video, performance.now());
        const faces = result.detections ?? [];

        if (phaseRef.current === 'calibrating') {
          calibrationFramesRef.current = faces.length === 1 ? calibrationFramesRef.current + 1 : 0;
          if (calibrationFramesRef.current >= 3) {
            setPhase('ready');
            if (!readySentRef.current) {
              readySentRef.current = true;
              onReady?.();
            }
          }
          return;
        }

        if (!activeRef.current || warningOpenRef.current) return;

        observe('no-face', faces.length === 0, 4_000, 'No face was detected for four seconds.');
        observe(
          'multiple-faces',
          faces.length > 1,
          2_000,
          `${faces.length} faces remained visible.`,
        );

        if (faces.length === 1) {
          const box = faces[0].boundingBox;
          const centerX = (box.originX + box.width / 2) / video.videoWidth;
          const centerY = (box.originY + box.height / 2) / video.videoHeight;
          const area = (box.width * box.height) / (video.videoWidth * video.videoHeight);
          const outOfPosition =
            centerX < 0.16 || centerX > 0.84 || centerY < 0.12 || centerY > 0.88 || area < 0.025;
          observe(
            'excessive-movement',
            outOfPosition,
            3_000,
            'The detected face remained outside the calibrated camera area.',
          );
        } else {
          observe('excessive-movement', false, 0, '');
        }
      } catch (caught) {
        setError(caught.message || 'Face detection stopped unexpectedly.');
      } finally {
        inferenceRef.current = false;
      }
    }, DETECTION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [observe, onReady, phase]);

  useEffect(() => {
    if (phase !== 'ready' || !active) return undefined;

    let blurTimer;
    const visibility = () => {
      if (document.hidden) report('tab-hidden', 'The document visibility state became hidden.');
    };
    const blur = () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        if (!document.hasFocus() && !document.hidden) {
          report('window-blur', 'The assessment window remained unfocused.');
        }
      }, 1_500);
    };
    const focus = () => clearTimeout(blurTimer);

    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    return () => {
      clearTimeout(blurTimer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
    };
  }, [active, phase, report]);

  const preparing = phase !== 'ready';

  return (
    <>
      {preparing && (
        <div className="fixed inset-0 z-[100] bg-surface flex items-center justify-center p-5">
          <section className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="aspect-video md:aspect-auto bg-black min-h-64 relative">
                <video
                  ref={attachVideo}
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                  aria-label="Live camera preview"
                />
                <div className="absolute inset-[12%] rounded-[50%] border-2 border-white/70 pointer-events-none" />
              </div>
              <div className="p-6 flex flex-col justify-center">
                <span className="material-symbols-outlined text-primary text-4xl">visibility</span>
                <h1 className="font-headline text-2xl font-black mt-3">Proctored assessment</h1>
                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                  Your camera is analysed on this device. No video or photo is uploaded. Leaving the
                  tab, blocking the camera, no face, multiple faces, or sustained movement outside the
                  frame creates a warning. The second warning ends the attempt with zero.
                </p>
                <p className="text-sm font-bold mt-4" aria-live="polite">
                  {STATUS_COPY[phase]}
                </p>
                {error && <p className="text-xs text-error font-bold mt-2">{error}</p>}
                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    disabled={phase === 'loading' || phase === 'calibrating'}
                    onClick={start}
                    className="flex-1 py-3 rounded-full bg-primary text-on-primary font-bold disabled:opacity-60"
                  >
                    {phase === 'idle' ? 'Enable camera' : 'Retry camera'}
                  </button>
                  {onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-5 py-3 rounded-full bg-surface-container font-bold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {phase === 'ready' && active && (
        <aside className="fixed top-20 right-3 z-40 w-36 rounded-xl overflow-hidden bg-black shadow-lg border border-white/20">
          <div className="aspect-video relative">
            <video
              ref={attachVideo}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
              aria-label="Proctoring camera preview"
            />
            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-green-700/90 text-white px-2 py-0.5 text-[9px] font-black uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
            </span>
          </div>
          <p className="text-white text-[10px] font-bold px-2 py-1.5">
            Warnings {warnings}/2
          </p>
          {error && (
            <p className="bg-error text-white text-[10px] font-bold px-2 py-1.5" role="alert">
              {error}
            </p>
          )}
        </aside>
      )}

      {notice && (
        <div className="fixed inset-0 z-[110] bg-black/60 grid place-items-center p-5" role="alertdialog" aria-modal="true">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 text-center shadow-2xl">
            <span className="material-symbols-outlined text-error text-5xl">warning</span>
            <h2 className="font-headline text-xl font-black mt-2">
              {notice.disqualified ? 'Assessment ended' : 'Proctoring warning'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-2">{notice.message}</p>
            <button
              type="button"
              onClick={() => {
                warningOpenRef.current = false;
                setNotice(null);
              }}
              className="mt-5 w-full py-3 rounded-full bg-primary text-on-primary font-bold"
            >
              {notice.disqualified ? 'View result' : 'I understand — continue'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
