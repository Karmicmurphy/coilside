// Web Speech API hook — real speech recognition when supported, graceful fallback otherwise.

"use client";

import { useCallback, useMemo, useRef, useState } from "react";

// Minimal ambient typings for SpeechRecognition — TS lib doesn't ship these.
interface SpeechRecognitionResultLike {
  0: { transcript: string; confidence: number };
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionResultListLike {
  length: number;
  item(i: number): SpeechRecognitionResultLike;
  [i: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  // Compute support once, lazily — no effect needed.
  const supported = useMemo(() => getRecognitionCtor() !== null, []);

  const start = useCallback(
    (onResult: (text: string, isFinal: boolean) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setError("Speech recognition not supported in this browser. Type instead.");
        return;
      }
      // Stop any prior session
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }

      const rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      onResultRef.current = onResult;

      rec.onstart = () => {
        setListening(true);
        setError(null);
      };
      rec.onend = () => {
        setListening(false);
        setInterim("");
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") {
          // benign
          setListening(false);
          return;
        }
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("Microphone permission denied. Type instead.");
        } else {
          setError(`Speech error: ${e.error}`);
        }
        setListening(false);
      };
      rec.onresult = (event) => {
        let interimText = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          const txt = r[0].transcript;
          if (r.isFinal) finalText += txt;
          else interimText += txt;
        }
        if (interimText) setInterim(interimText);
        else setInterim("");
        if (finalText && onResultRef.current) {
          onResultRef.current(finalText.trim(), true);
        }
      };

      try {
        rec.start();
        recognitionRef.current = rec;
      } catch {
        setError("Could not start speech recognition. Type instead.");
        setListening(false);
      }
    },
    []
  );

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    }
  }, []);

  const abort = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      setListening(false);
      setInterim("");
    }
  }, []);

  return {
    supported,
    listening,
    interim,
    error,
    start,
    stop,
    abort,
    clearError: () => setError(null),
  };
}
