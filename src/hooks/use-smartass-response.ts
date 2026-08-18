// Helper for the optional smartass predefined voice responses.
// Uses the FREE browser SpeechSynthesis API. No AI, no paid services.
// Respects the user's "smartassEnabled" setting — if off, does nothing.

"use client";

import { useCoilsideStore } from "@/lib/store";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

/** Speak a predefined smartass response, but only if the user has it enabled
 *  AND TTS is enabled. Safe to call from any client component. */
export function useSmartassResponse() {
  const smartassEnabled = useCoilsideStore(
    (s) => s.settings.voice.smartassEnabled
  );
  const { speak, supported, ttsEnabled } = useTextToSpeech();

  return (text: string) => {
    if (!supported || !ttsEnabled || !smartassEnabled) return;
    speak(text, { force: true });
  };
}
