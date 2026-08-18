"use client";

// Reusable editable checklist component used by Annual Service, Before I Leave, and Install checklists.

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCoilsideStore } from "@/lib/store";
import type { Checklist, ChecklistItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditableChecklist({
  checklist,
  accentColor = "amber",
}: {
  checklist: Checklist;
  accentColor?: "amber" | "cyan";
}) {
  const toggle = useCoilsideStore((s) => s.toggleChecklistItem);
  const add = useCoilsideStore((s) => s.addChecklistItem);
  const remove = useCoilsideStore((s) => s.removeChecklistItem);
  const update = useCoilsideStore((s) => s.updateChecklistItem);
  const reorder = useCoilsideStore((s) => s.reorderChecklistItem);
  const reset = useCoilsideStore((s) => s.resetChecklist);

  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const doneCount = checklist.items.filter((i) => i.done).length;
  const totalCount = checklist.items.length;
  const allDone = doneCount === totalCount && totalCount > 0;

  function handleAdd() {
    if (!newLabel.trim()) return;
    add(checklist.id, newLabel.trim());
    setNewLabel("");
  }

  function handleEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setDraftLabel(item.label);
  }
  function saveEdit() {
    if (editingId && draftLabel.trim()) {
      update(checklist.id, editingId, { label: draftLabel.trim() });
    }
    setEditingId(null);
    setDraftLabel("");
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                accentColor === "amber" ? "bg-amber-500" : "bg-cyan-400"
              )}
              style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
        <p className="text-sm font-bold tabular-nums text-muted-foreground">
          {doneCount} / {totalCount}
        </p>
      </div>

      {/* Items */}
      <ul className="space-y-2">
        {checklist.items.map((item, idx) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-card p-2",
              item.done ? "border-amber-500/30 opacity-70" : "border-border"
            )}
          >
            <button
              onClick={() => toggle(checklist.id, item.id)}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                item.done
                  ? accentColor === "amber"
                    ? "border-amber-500 bg-amber-500 text-black"
                    : "border-cyan-400 bg-cyan-400 text-black"
                  : "border-border bg-background"
              )}
              aria-label={item.done ? "Mark not done" : "Mark done"}
            >
              {item.done && <Check size={22} />}
            </button>

            {editingId === item.id ? (
              <Input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                autoFocus
                className="h-11 flex-1"
              />
            ) : (
              <button
                onClick={() => handleEdit(item)}
                className={cn(
                  "flex-1 px-2 text-left text-base",
                  item.done && "line-through"
                )}
              >
                {item.label}
              </button>
            )}

            <div className="flex items-center">
              <button
                onClick={() => reorder(checklist.id, idx, idx - 1)}
                disabled={idx === 0}
                className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => reorder(checklist.id, idx, idx + 1)}
                disabled={idx === checklist.items.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => remove(checklist.id, item.id)}
                className="flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/15"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add a checklist item..."
          className="h-12"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} className="h-12 bg-amber-500 text-black hover:bg-amber-400" aria-label="Add item">
          <Plus size={18} />
        </Button>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            if (confirm("Uncheck all items?")) reset(checklist.id);
          }}
          variant="ghost"
          className="h-11 flex-1"
        >
          <X size={16} className="mr-1" /> Reset all
        </Button>
        {allDone && (
          <div className="flex h-11 items-center rounded-md bg-amber-500/15 px-3 text-sm font-bold text-amber-300">
            ✓ All done
          </div>
        )}
      </div>
    </div>
  );
}
