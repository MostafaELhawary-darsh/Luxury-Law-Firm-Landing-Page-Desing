import { useRef, useState, useCallback, useEffect } from 'react';
import type { VoiceLanguage } from '@/lib/voiceTypes';

type RecognitionResult = (transcript: string) => void;
type RecognitionError = (error: string) => void;

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [key: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [key: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  interim: string;
  start: (lang: VoiceLanguage, onResult: RecognitionResult, onError?: RecognitionError) => void;
  stop: () => void;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognition {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const resultRef = useRef<RecognitionResult | null>(null);
  const errorRef = useRef<RecognitionError | null>(null);
  const manualStopRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* noop */ }
    }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback((lang: VoiceLanguage, onResult: RecognitionResult, onError?: RecognitionError) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('unsupported');
      onError?.('unsupported');
      return;
    }
    setError(null);
    setInterim('');
    manualStopRef.current = false;
    resultRef.current = onResult;
    errorRef.current = onError || null;

    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* noop */ }
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let interimText = '';
      let finalText = '';
      const results = e.results;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const alt = result[0];
        if (result.isFinal) {
          finalText += alt.transcript;
        } else {
          interimText += alt.transcript;
        }
      }
      setInterim(interimText);
      if (finalText.trim() && resultRef.current) {
        resultRef.current(finalText.trim());
        setInterim('');
      }
    };

    rec.onerror = (e) => {
      const msg = e.error || 'error';
      setError(msg);
      if (msg !== 'no-speech' && msg !== 'aborted') {
        setListening(false);
      }
      if (errorRef.current) errorRef.current(msg);
    };

    rec.onend = () => {
      if (!manualStopRef.current) {
        // Auto-restart if recognition ended unexpectedly (not from manual stop)
        const maxRetries = 3;
        if (retryCountRef.current < maxRetries) {
          const attempt = retryCountRef.current;
          retryCountRef.current += 1;
          const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          retryTimerRef.current = setTimeout(() => {
            try {
              rec.start();
            } catch {
              setListening(false);
              setInterim('');
            }
          }, backoff);
          return;
        }
      }
      setListening(false);
      setInterim('');
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError('start-failed');
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (recRef.current) {
        try { recRef.current.abort(); } catch { /* noop */ }
      }
    };
  }, []);

  return { supported, listening, interim, start, stop, error };
}
