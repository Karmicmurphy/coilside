"use client";

// WHAT SEAN TAUGHT ME — list + new/edit Sean learning notes.
// Distinct from the general Notes screen — these are dedicated learning notes
// from Sean, with their own category set including Tools and Annual Service.
//
// When a note's category maps to a Field Guide section (Capacitor, Contactor,
// Thermostat, Refrigerant, Indoor Coil), the corresponding Field Guide page
// will surface it under a "SEAN'S NOTES" panel.

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useNav } from "@/lib/nav";
import { useCoilsideStore } from "@/lib/store";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { SEAN_CATEGORIES, SEAN_CATEGORY_LABEL } from "@/lib/defaults";
import type { SeanCategory, SeanFactorNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mic,
  MicOff,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { cn, formatDateLabel } from "@/lib/utils";

/** If navigated here with contextId "sean-cat:<category>", pre-select that category. */
function usePreselectedCategory(): SeanCategory {
  const ctx = useNav((s) => s.contextId);
  if (ctx && ctx.startsWith("sean-cat:")) {
    const cat = ctx.slice("sean-cat:".length) as SeanCategory;
    if (SEAN_CATEGORIES.some((c) => c.value === cat)) return cat;
  }
  return "capacitor";
}

// ----------------------------------------------------------------------------
// NEW SEAN NOTE
// ----------------------------------------------------------------------------
export function SeanNoteNewScreen() {
  const { go } = useRouter();
  const add = useCoilsideStore((s) => s.addSeanNote);
  const speech = useSpeechRecognition();
  const tts = useTextToSpeech();

  const initialCategory = usePreselectedCategory();
  const [category, setCategory] = useState<SeanCategory>(initialCategory);
  const [text, setText] = useState("");

  function handleStartSpeech() {
    speech.start((finalText) => {
      setText((prev) => {
        const sep = prev && !prev.endsWith(" ") ? " " : "";
        return prev + sep + finalText;
      });
    });
  }

  function handleSave() {
    if (!text.trim()) return;
    add({ category, text: text.trim() });
    setText("");
    go("sean-notes");
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="WHAT SEAN TAUGHT ME" subtitle="New learning note" />
      <div className="space-y-4 p-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Category
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SEAN_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "tap-lg rounded-md border-2 px-3 py-3 text-left text-sm font-bold",
                  category === c.value
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-border bg-card text-foreground/80"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="snt" className="text-xs uppercase tracking-wider text-muted-foreground">
            What Sean taught me
          </Label>
          <Textarea
            id="snt"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Type or use speech-to-text..."
            className="mt-1 text-base"
            autoFocus
          />
          {speech.interim && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              ... {speech.interim}
            </p>
          )}
        </div>

        {speech.error && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
            {speech.error}
          </div>
        )}
        {!speech.supported && (
          <p className="text-xs text-muted-foreground">
            Speech recognition isn&apos;t supported in this browser. Type your
            note instead.
          </p>
        )}

        {speech.supported && (
          <Button
            onClick={speech.listening ? speech.stop : handleStartSpeech}
            className={cn(
              "h-14 w-full",
              speech.listening
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-cyan-500 text-black hover:bg-cyan-400"
            )}
          >
            {speech.listening ? (
              <>
                <MicOff size={22} className="mr-2" /> STOP LISTENING
              </>
            ) : (
              <>
                <Mic size={22} className="mr-2" /> SPEECH TO TEXT 🎙️
              </>
            )}
          </Button>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="h-12 flex-1 bg-amber-500 text-black hover:bg-amber-400"
          >
            <Save size={18} className="mr-1" /> Save Note
          </Button>
          <Button variant="ghost" onClick={() => go("sean-notes")} className="h-12">
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SEAN NOTES LIST
// ----------------------------------------------------------------------------
export function SeanNotesList() {
  const { go } = useRouter();
  const seanNotes = useCoilsideStore((s) => s.seanNotes);
  const del = useCoilsideStore((s) => s.deleteSeanNote);
  const update = useCoilsideStore((s) => s.updateSeanNote);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SeanCategory | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<SeanCategory>("general");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return seanNotes.filter((n) => {
      if (filter !== "all" && n.category !== filter) return false;
      if (q && !n.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [seanNotes, search, filter]);

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="WHAT SEAN TAUGHT ME"
        subtitle={`${seanNotes.length} saved`}
        right={
          <button
            onClick={() => go("sean-note-new")}
            className="tap-lg flex h-10 items-center rounded-lg bg-amber-500 px-3 text-xs font-bold text-black"
          >
            + NEW
          </button>
        }
      />
      <div className="space-y-3 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Sean notes..."
            className="h-11 pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          {SEAN_CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              active={filter === c.value}
              onClick={() => setFilter(c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {seanNotes.length === 0
              ? "No Sean notes yet — tap + NEW to add one."
              : "No notes match your search."}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <SeanNoteCard
                key={n.id}
                note={n}
                onDelete={() => del(n.id)}
                onStartEdit={() => {
                  setEditingId(n.id);
                  setEditText(n.text);
                  setEditCategory(n.category);
                }}
                editing={editingId === n.id}
                editText={editText}
                editCategory={editCategory}
                onEditText={setEditText}
                onEditCategory={setEditCategory}
                onSaveEdit={() => {
                  if (editText.trim()) {
                    update(n.id, { text: editText.trim(), category: editCategory });
                  }
                  setEditingId(null);
                }}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SeanNoteCard({
  note,
  onDelete,
  onStartEdit,
  editing,
  editText,
  editCategory,
  onEditText,
  onEditCategory,
  onSaveEdit,
  onCancelEdit,
}: {
  note: SeanFactorNote;
  onDelete: () => void;
  onStartEdit: () => void;
  editing: boolean;
  editText: string;
  editCategory: SeanCategory;
  onEditText: (s: string) => void;
  onEditCategory: (c: SeanCategory) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const tts = useTextToSpeech();

  if (editing) {
    return (
      <li className="rounded-lg border-2 border-amber-500/40 bg-card p-3">
        <div className="mb-2">
          <Label className="text-xs uppercase text-muted-foreground">Category</Label>
          <select
            value={editCategory}
            onChange={(e) => onEditCategory(e.target.value as SeanCategory)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            {SEAN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          value={editText}
          onChange={(e) => onEditText(e.target.value)}
          rows={4}
          autoFocus
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={onSaveEdit}
            className="h-9 bg-amber-500 text-black hover:bg-amber-400"
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-9">
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          {SEAN_CATEGORY_LABEL[note.category]}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatDateLabel(new Date(note.createdAt).toISOString().slice(0, 10))}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground/90">{note.text}</p>
      <div className="mt-2 flex gap-1">
        {tts.supported && tts.ttsEnabled && (
          <button
            onClick={() => tts.speak(note.text)}
            className="tap-lg flex h-8 w-8 items-center justify-center rounded text-amber-400 hover:bg-amber-500/15"
            aria-label="Speak note"
          >
            <Volume2 size={14} />
          </button>
        )}
        <button
          onClick={onStartEdit}
          className="tap-lg flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this Sean note?")) onDelete();
          }}
          className="tap-lg flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/15"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold",
        active ? "bg-amber-500 text-black" : "bg-secondary text-foreground/80"
      )}
    >
      {children}
    </button>
  );
}
