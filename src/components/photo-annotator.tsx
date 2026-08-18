"use client";

// Renders an equipment photo with overlay callouts.
// Callouts use normalized 0..1 coordinates so they survive resize.

import { useRef, useState } from "react";
import type { ComponentTag, PhotoCallout } from "@/lib/types";
import { COMPONENT_TAG_LABEL } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

interface PhotoAnnotatorProps {
  src: string;
  alt: string;
  callouts: PhotoCallout[];
  editable?: boolean;
  /** Component tag suggestion list for new callouts */
  tagChoices?: ComponentTag[];
  onAddCallout?: (callout: { tag: ComponentTag; label: string; x: number; y: number }) => void;
  onRemoveCallout?: (calloutId: string) => void;
  className?: string;
}

export function PhotoAnnotator({
  src,
  alt,
  callouts,
  editable = false,
  tagChoices,
  onAddCallout,
  onRemoveCallout,
  className,
}: PhotoAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [addingTag, setAddingTag] = useState<ComponentTag | null>(null);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!editable || !addingTag || !onAddCallout) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setPendingPos({ x, y });
  }

  function confirmAdd() {
    if (!addingTag || !pendingPos || !onAddCallout) return;
    onAddCallout({
      tag: addingTag,
      label: COMPONENT_TAG_LABEL[addingTag],
      x: pendingPos.x,
      y: pendingPos.y,
    });
    setAddingTag(null);
    setPendingPos(null);
  }

  function cancelAdd() {
    setAddingTag(null);
    setPendingPos(null);
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden rounded-lg border border-border bg-card", className)}>
      <img
        src={src}
        alt={alt}
        onClick={handleImageClick}
        className={cn(
          "block h-auto w-full select-none",
          editable && addingTag && "cursor-crosshair"
        )}
        draggable={false}
      />

      {/* Callouts overlay */}
      {callouts.map((c) => (
        <div
          key={c.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
        >
          <div className="relative flex flex-col items-center">
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500 bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow">
              {c.label}
              {editable && onRemoveCallout && (
                <button
                  onClick={() => onRemoveCallout(c.id)}
                  className="pointer-events-auto -mr-1 ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/60"
                  aria-label={`Remove ${c.label} callout`}
                >
                  <Trash2 size={8} />
                </button>
              )}
            </span>
            {/* Pointer dot */}
            <span className="mt-0.5 block h-2 w-2 rounded-full border border-amber-500 bg-amber-500 shadow" />
          </div>
        </div>
      ))}

      {/* Pending-position preview while adding a callout */}
      {editable && pendingPos && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pendingPos.x * 100}%`, top: `${pendingPos.y * 100}%` }}
        >
          <span className="block h-3 w-3 animate-pulse rounded-full border-2 border-amber-400 bg-amber-500/40" />
        </div>
      )}

      {/* Editable toolbar */}
      {editable && tagChoices && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1 border-t border-border bg-background/85 px-2 py-1.5 backdrop-blur">
          {!addingTag ? (
            <>
              <span className="mr-1 inline-flex items-center text-[10px] uppercase text-muted-foreground">
                <Plus size={10} className="mr-0.5" /> Add callout:
              </span>
              {tagChoices.map((t) => (
                <button
                  key={t}
                  onClick={() => setAddingTag(t)}
                  className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold text-foreground/80 hover:border-amber-500"
                >
                  {COMPONENT_TAG_LABEL[t]}
                </button>
              ))}
            </>
          ) : (
            <>
              <span className="mr-1 text-[10px] uppercase text-amber-300">
                Tap photo where <strong>{COMPONENT_TAG_LABEL[addingTag]}</strong> is →
              </span>
              {pendingPos ? (
                <button
                  onClick={confirmAdd}
                  className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black"
                >
                  Confirm
                </button>
              ) : null}
              <button
                onClick={cancelAdd}
                className="rounded border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
