"use client";

// SEAN'S NOTES — a small panel that surfaces Sean learning notes whose
// category matches the current Field Guide section.
//
// This makes "What Sean taught me" notes appear where the user actually
// needs them (e.g. a Capacitor note appears on the Capacitor page).

import { useMemo } from "react";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { SEAN_CATEGORY_LABEL } from "@/lib/defaults";
import type { EquipmentNote } from "@/lib/types";
import { Flame, Pencil, Plus, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateLabel } from "@/lib/utils";

const SECTION_TO_SEAN_CATEGORY: Record<
  EquipmentNote["section"],
  "capacitor" | "contactor" | "thermostat-wiring" | "refrigerant" | "indoor-coil"
> = {
  capacitor: "capacitor",
  contactor: "contactor",
  thermostat: "thermostat-wiring",
  refrigerant: "refrigerant",
  "indoor-coil": "indoor-coil",
};

export function SeansNotesPanel({
  section,
}: {
  section: EquipmentNote["section"];
}) {
  const { go } = useRouter();
  const seanNotes = useCoilsideStore((s) => s.seanNotes);
  const del = useCoilsideStore((s) => s.deleteSeanNote);

  const seanCategory = SECTION_TO_SEAN_CATEGORY[section];

  const notes = useMemo(
    () => seanNotes.filter((n) => n.category === seanCategory),
    [seanNotes, seanCategory]
  );

  return (
    <section className="mt-6 border-t-2 border-amber-500/30 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-extrabold uppercase tracking-wide text-amber-400">
          <Flame size={16} /> SEAN&apos;S NOTES
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            go("sean-note-new", { contextId: `sean-cat:${seanCategory}` })
          }
          className="h-9 px-3"
        >
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Sean notes for {SEAN_CATEGORY_LABEL[seanCategory]} yet. Sean says
          something smart? Tap <strong>Add</strong> and write it down.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <SeanNoteRow
              key={n.id}
              text={n.text}
              date={formatDateLabel(
                new Date(n.createdAt).toISOString().slice(0, 10)
              )}
              onSpeak={() => {}}
              onEdit={() => go("sean-notes")}
              onDelete={() => {
                if (confirm("Delete this Sean note?")) del(n.id);
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SeanNoteRow({
  text,
  date,
  onSpeak,
  onEdit,
  onDelete,
}: {
  text: string;
  date: string;
  onSpeak: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tts = useTextToSpeech();
  return (
    <li className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{text}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {tts.supported && tts.ttsEnabled && (
            <button
              onClick={() => tts.speak(text)}
              className="tap-lg flex h-8 w-8 items-center justify-center rounded text-amber-400 hover:bg-amber-500/15"
              aria-label="Speak note"
            >
              <Volume2 size={14} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="tap-lg flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="tap-lg flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/15"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}
