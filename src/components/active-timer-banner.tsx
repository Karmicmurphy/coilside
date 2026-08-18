"use client";

// Active timer banner — shows when a work timer is running.
// Ticks every second using a 1-second interval that re-renders elapsed time.

import { useEffect, useState } from "react";
import { Pause, Square } from "lucide-react";
import { useCoilsideStore } from "@/lib/store";
import { formatElapsed } from "@/lib/utils";
import { useRouter } from "./screen-router";

export function ActiveTimerBanner() {
  const active = useCoilsideStore((s) => s.activeTimer);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const { go } = useRouter();

  if (!active) return null;

  const elapsed = Date.now() - active.startedAt;
  const label = active.employer === "tim" ? "Tim Johnson" : "Sean / Farmhouse";

  return (
    <button
      onClick={() => go("work")}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-between gap-3 border-t-2 border-amber-500/40 bg-amber-500/10 px-4 py-3 backdrop-blur [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
        </span>
        <div className="text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {label}
          </p>
          <p className="font-mono text-xl font-extrabold tabular-nums text-amber-100">
            {formatElapsed(elapsed)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-amber-100">
        <Pause size={18} />
        <Square size={18} />
      </div>
    </button>
  );
}
