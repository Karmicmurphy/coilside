"use client";

import {
  ClipboardCheck,
  ListChecks,
  Mic,
  NotebookPen,
  PlayCircle,
  Wrench,
  HardHat,
  Flame,
} from "lucide-react";
import { BigButton } from "@/components/big-button";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";

export function HomeScreen() {
  const { go } = useRouter();
  const notesCount = useCoilsideStore((s) => s.notes.length);
  const seanNotesCount = useCoilsideStore((s) => s.seanNotes.length);

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-28 [padding-top:max(1rem,env(safe-area-inset-top))]">
      {/* Brand header */}
      <div className="mb-3 flex items-center justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
            Field Companion
          </p>
          <h1 className="text-3xl font-black tracking-tight">COILSIDE</h1>
        </div>
        <HardHat className="h-8 w-8 text-amber-400" strokeWidth={1.6} />
      </div>

      {/* Primary buttons */}
      <div className="flex flex-col gap-3">
        <BigButton
          label="START WORK"
          description="Tim Johnson / Sean"
          icon={<PlayCircle className="h-7 w-7 text-amber-400" />}
          variant="primary"
          onClick={() => go("work")}
        />
        <BigButton
          label="SERVICE CALL"
          description="Visual troubleshooting"
          icon={<Wrench className="h-7 w-7 text-amber-400" />}
          onClick={() => go("service-call")}
        />
        <BigButton
          label="ANNUAL SERVICE"
          description="Editable checklist"
          icon={<ListChecks className="h-7 w-7 text-amber-400" />}
          onClick={() => go("annual-service")}
        />
        <BigButton
          label="FIELD GUIDE"
          description="Visual references + my photos"
          icon={<ClipboardCheck className="h-7 w-7 text-amber-400" />}
          onClick={() => go("field-guide")}
        />
        <BigButton
          label="ADD NOTE"
          description="Type or speech-to-text"
          icon={<Mic className="h-7 w-7 text-amber-400" />}
          onClick={() => go("note-new")}
        />
        <BigButton
          label="THE SEAN FACTOR"
          description={
            seanNotesCount > 0
              ? `Notes: ${seanNotesCount}`
              : "What Sean taught me / said"
          }
          icon={<Flame className="h-7 w-7 text-amber-400" />}
          variant="warning"
          onClick={() => go("sean-factor")}
        />
        <BigButton
          label="BEFORE I LEAVE"
          description="Final callback-prevention checklist"
          icon={<NotebookPen className="h-7 w-7 text-amber-400" />}
          variant="warning"
          onClick={() => go("before-i-leave")}
        />
      </div>

      {/* Footer info */}
      <div className="mt-auto pt-4 text-center text-xs text-muted-foreground">
        {notesCount > 0 ? (
          <button
            onClick={() => go("notes")}
            className="font-semibold text-amber-400 underline-offset-2 hover:underline"
          >
            {notesCount} note{notesCount === 1 ? "" : "s"} saved →
          </button>
        ) : (
          <span>Tap any button above to start. No account needed.</span>
        )}
      </div>
    </div>
  );
}
