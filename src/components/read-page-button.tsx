"use client";

// ReadPageButton — speaks the useful text on the current reference page.
// Uses the FREE browser SpeechSynthesis API. Hides when TTS is unavailable
// or when the user has disabled TTS in settings.

import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";

export function ReadPageButton({
  getText,
  className,
}: {
  /** Returns the text to speak. Memoized text construction belongs in the
   *  parent component to avoid rebuilding the string each render. */
  getText: () => string;
  className?: string;
}) {
  const tts = useTextToSpeech();

  if (!tts.supported || !tts.ttsEnabled) return null;

  const speak = () => {
    if (tts.speaking) {
      tts.stop();
    } else {
      const text = getText();
      if (text.trim()) tts.speak(text);
    }
  };

  return (
    <button
      onClick={speak}
      aria-label={tts.speaking ? "Stop reading" : "Read this page aloud"}
      className={cn(
        "tap-lg flex h-10 items-center gap-1 rounded-md border px-3 text-xs font-bold",
        tts.speaking
          ? "border-red-500/50 bg-red-500/15 text-red-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300",
        className
      )}
    >
      {tts.speaking ? (
        <>
          <VolumeX size={14} /> STOP
        </>
      ) : (
        <>
          <Volume2 size={14} /> 🔊 READ THIS PAGE
        </>
      )}
    </button>
  );
}
