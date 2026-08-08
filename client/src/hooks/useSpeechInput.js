import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

/**
 * Dictation via the Web Speech API, offered as progressive enhancement:
 * where the browser has no support the hook reports `supported: false` and
 * the caller simply keeps the textarea.
 *
 * Interim results are surfaced separately so the caller can show them without
 * committing them to the answer.
 */
export function useSpeechInput({ onCommit } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) commitRef.current?.(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : 'Dictation stopped unexpectedly.',
      );
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        /* Already stopped. */
      }
    };
  }, []);

  const start = useCallback(() => {
    setError('');
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      /* start() throws if already running; the state is already correct. */
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return {
    supported: Boolean(SpeechRecognition),
    listening,
    interim,
    error,
    start,
    stop,
    toggle: () => (listening ? stop() : start()),
  };
}
