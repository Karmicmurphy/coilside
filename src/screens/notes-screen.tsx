"use client";

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { NOTE_CATEGORIES, NOTE_CATEGORY_LABEL } from "@/lib/defaults";
import type { NoteCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Save, Search, Trash2, Pencil, X } from "lucide-react";
import { formatDateLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function NoteNewScreen() {
  const { go } = useRouter();
  const add = useCoilsideStore((s) => s.addNote);
  const settings = useCoilsideStore((s) => s.settings);

  const speech = useSpeechRecognition();

  // Sean Taught Me flag from nav context
  const seanTaught = useSeanTaughtFlag();

  const [category, setCategory] = useState<NoteCategory>("general-reminder");
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
    add({
      category,
      text: text.trim(),
      seanTaught: seanTaught ? true : undefined,
    });
    setText("");
    go("notes", { reset: false });
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title={seanTaught ? "Sean Taught Me..." : "New Note"} />
      <div className="space-y-4 p-4">
        {seanTaught && (
          <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Recording a learning note from Sean. Pick the right category below.
          </div>
        )}

        {/* Category */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {NOTE_CATEGORIES.map((c) => (
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

        {/* Textarea */}
        <div>
          <Label htmlFor="tt" className="text-xs uppercase tracking-wider text-muted-foreground">Note</Label>
          <Textarea
            id="tt"
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

        {/* Speech status / errors */}
        {speech.error && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
            {speech.error}
          </div>
        )}
        {!speech.supported && (
          <p className="text-xs text-muted-foreground">
            Speech recognition isn&apos;t supported in this browser. Type your note instead.
          </p>
        )}

        {/* Speech button */}
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

        {/* Save */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!text.trim()} className="h-12 flex-1 bg-amber-500 text-black hover:bg-amber-400">
            <Save size={18} className="mr-1" /> Save Note
          </Button>
          <Button variant="ghost" onClick={() => go("notes")} className="h-12">
            <X size={16} />
          </Button>
        </div>

        {settings.showSeanTaughtShortcut && !seanTaught && (
          <div className="rounded-lg border border-amber-500/30 bg-card p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Quick button — start a learning note immediately:
            </p>
            <Button
              onClick={() => {
                setCategory("general-reminder");
                document.getElementById("tt")?.focus();
              }}
              variant="outline"
              className="h-11 w-full border-amber-500 text-amber-300"
            >
              <Mic size={16} className="mr-1" /> SEAN TAUGHT ME… 🎙️
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Reads nav contextId to detect "sean-taught" mode
import { useNav } from "@/lib/nav";
function useSeanTaughtFlag() {
  return useNav((s) => s.contextId) === "sean-taught";
}

// ----------------------------------------------------------------------------
// Notes list screen
// ----------------------------------------------------------------------------
export function NotesListScreen() {
  const { go } = useRouter();
  const notes = useCoilsideStore((s) => s.notes);
  const del = useCoilsideStore((s) => s.deleteNote);
  const update = useCoilsideStore((s) => s.updateNote);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NoteCategory | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return notes.filter((n) => {
      if (filter !== "all" && n.category !== filter) return false;
      if (q && !n.text.toLowerCase().includes(q) && !(n.seanTaught && "sean taught".includes(q))) return false;
      return true;
    });
  }, [notes, search, filter]);

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Notes"
        subtitle={`${notes.length} saved`}
        right={
          <button
            onClick={() => go("note-new")}
            className="tap-lg flex h-10 items-center rounded-lg bg-amber-500 px-3 text-xs font-bold text-black"
          >
            + NEW
          </button>
        }
        showHome
      />
      <div className="space-y-3 p-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="h-11 pl-9"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          {NOTE_CATEGORIES.map((c) => (
            <Chip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
              {c.label}
            </Chip>
          ))}
        </div>

        {/* Quick add Sean note */}
        <button
          onClick={() => go("note-new", { contextId: "sean-taught" })}
          className="w-full rounded-lg border-2 border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300"
        >
          <Mic size={16} className="mr-1 inline" /> SEAN TAUGHT ME… 🎙️
        </button>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {notes.length === 0 ? "No notes yet — tap + NEW to add one." : "No notes match your search."}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <li key={n.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        {NOTE_CATEGORY_LABEL[n.category]}
                      </span>
                      {n.seanTaught && (
                        <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                          Sean
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{formatDateLabel(new Date(n.createdAt).toISOString().slice(0, 10))}</span>
                    </div>
                    {editingId === n.id ? (
                      <div>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={4}
                          autoFocus
                        />
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (editText.trim()) update(n.id, { text: editText.trim() });
                              setEditingId(null);
                            }}
                            className="h-9 bg-amber-500 text-black hover:bg-amber-400"
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm text-foreground/90">{n.text}</p>
                    )}
                  </div>
                  {editingId !== n.id && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => {
                          setEditingId(n.id);
                          setEditText(n.text);
                        }}
                        className="tap-lg flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this note?")) del(n.id);
                        }}
                        className="tap-lg flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/15"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
