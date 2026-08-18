// Text-to-Speech hook — uses the browser's native SpeechSynthesis API.
// No paid services. Falls back gracefully (returns supported=false) when
// the browser doesn't expose speechSynthesis.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoilsideStore } from "@/lib/store";

interface VoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
}

function toVoiceInfo(v: SpeechSynthesisVoice): VoiceInfo {
  return { name: v.name, lang: v.lang, voiceURI: v.voiceURI };
}

export function useTextToSpeech() {
  // Whether the browser exposes SpeechSynthesis at all
  const supported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.speechSynthesis.speak === "function",
    []
  );

  // Pull voice prefs from the store so all callers stay in sync
  const ttsEnabled = useCoilsideStore((s) => s.settings.voice.ttsEnabled);
  const speechRate = useCoilsideStore((s) => s.settings.voice.speechRate);
  const preferredVoiceURI = useCoilsideStore(
    (s) => s.settings.voice.preferredVoiceURI
  );
  const updateVoiceSettings = useCoilsideStore((s) => s.updateVoiceSettings);

  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (they load asynchronously on some browsers)
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setVoices(v.map(toVoiceInfo));
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      if (supported) {
        try {
          window.speechSynthesis.onvoiceschanged = null;
        } catch {
          /* ignore */
        }
      }
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, opts?: { force?: boolean }) => {
      if (!supported) return;
      // Respect master toggle unless explicitly forced
      if (!ttsEnabled && !opts?.force) return;
      if (!text || !text.trim()) return;

      // Cancel any current speech first
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }

      const u = new SpeechSynthesisUtterance(text);
      u.rate = Math.max(0.5, Math.min(2, speechRate));
      if (preferredVoiceURI) {
        const match = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === preferredVoiceURI);
        if (match) u.voice = match;
      }

      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      u.onpause = () => setSpeaking(false);
      u.onresume = () => setSpeaking(true);

      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [supported, ttsEnabled, speechRate, preferredVoiceURI]
  );

  return {
    supported,
    speaking,
    voices,
    speak,
    stop,
    ttsEnabled,
    speechRate,
    preferredVoiceURI,
    setTtsEnabled: (v: boolean) => updateVoiceSettings({ ttsEnabled: v }),
    setSpeechRate: (r: number) =>
      updateVoiceSettings({ speechRate: Math.max(0.5, Math.min(2, r)) }),
    setPreferredVoiceURI: (uri: string | undefined) =>
      updateVoiceSettings({ preferredVoiceURI: uri }),
  };
}
