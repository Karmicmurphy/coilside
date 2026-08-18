"use client";

// Reusable panel for personal field notes attached to a section.
// Built-in reminders are kept visually separate from personal notes — user explicitly wants this distinction.

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCoilsideStore } from "@/lib/store";
import type { EquipmentNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateLabel } from "@/lib/utils";

export function FieldNotesPanel({
  section,
  title = "My Field Notes",
}: {
  section: EquipmentNote["section"];
  title?: string;
}) {
  // IMPORTANT: don't return a freshly-filtered array from the selector —
  // Zustand would treat it as a new reference each render and loop forever.
  // Instead select the raw array, then memoize the filtered version.
  const allNotes = useCoilsideStore((s) => s.equipmentNotes);
  const add = useCoilsideStore((s) => s.addEquipmentNote);
  const update = useCoilsideStore((s) => s.updateEquipmentNote);
  const del = useCoilsideStore((s) => s.deleteEquipmentNote);

  const notes = useMemo(
    () => allNotes.filter((n) => n.section === section),
    [allNotes, section]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [creating, setCreating] = useState(false);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraftTitle("");
    setDraftBody("");
  }
  function startEdit(n: EquipmentNote) {
    setEditingId(n.id);
    setCreating(false);
    setDraftTitle(n.title);
    setDraftBody(n.body);
  }
  function cancel() {
    setEditingId(null);
    setCreating(false);
    setDraftTitle("");
    setDraftBody("");
  }
  function save() {
    if (!draftTitle.trim() && !draftBody.trim()) {
      cancel();
      return;
    }
    if (editingId) {
      update(editingId, { title: draftTitle.trim() || "(untitled)", body: draftBody });
    } else {
      add({ section, title: draftTitle.trim() || "(untitled)", body: draftBody });
    }
    cancel();
  }

  return (
    <section className="mt-6 border-t-2 border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="heading-industrial text-base font-extrabold text-amber-400">{title}</h2>
        <Button size="sm" variant="outline" onClick={startCreate} className="h-10 px-3">
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {(creating || editingId) && (
        <div className="mt-3 rounded-lg border-2 border-amber-500/40 bg-card p-3">
          <div className="mb-2">
            <Label htmlFor="nt">Title</Label>
            <Input
              id="nt"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Short title"
              className="h-11"
            />
          </div>
          <div className="mb-2">
            <Label htmlFor="nb">Note</Label>
            <Textarea
              id="nb"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="What did you learn? What did your employer say? What's special about this unit?"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="h-11 flex-1 bg-amber-500 text-black hover:bg-amber-400">
              Save
            </Button>
            <Button variant="ghost" onClick={cancel} className="h-11">
              <X size={16} />
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !creating ? (
        <p className="mt-3 text-sm text-muted-foreground">No personal notes here yet. Add your own — they&apos;re separate from the built-in reminders.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateLabel(new Date(n.updatedAt).toISOString().slice(0, 10))}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(n)} className="tap-lg flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => del(n.id)} className="tap-lg flex h-9 w-9 items-center justify-center rounded-md text-red-400 hover:bg-red-500/15">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {n.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
