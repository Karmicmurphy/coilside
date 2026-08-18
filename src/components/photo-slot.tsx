"use client";

// PhotoSlot — Field Guide reference pages use this to show a REAL user photo
// if one is attached to the section, otherwise fall back to the built-in SVG.
//
// Also provides a "+ My Photo" button to jump to the photo library where the
// user can take/upload a photo of the equipment they're standing beside.

import { useMemo } from "react";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import type { EquipmentNote } from "@/lib/types";
import { Camera, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/components/photo-image";

interface PhotoSlotProps {
  section: EquipmentNote["section"];
  /** SVG illustration to render when no user photo is attached */
  fallback?: React.ReactNode;
  /** Title for the slot, e.g. "Capacitor — Outdoor Condenser" */
  title?: string;
}

export function PhotoSlot({ section, fallback, title }: PhotoSlotProps) {
  const { go } = useRouter();
  const photos = useCoilsideStore((s) => s.equipmentPhotos);

  // Find the first photo attached to this section (newest first since store
  // stores them with newest at top)
  const attached = useMemo(
    () => photos.find((p) => p.fieldGuideSection === section),
    [photos, section]
  );

  return (
    <section>
      {title && (
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-amber-400">
          {title}
        </h3>
      )}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {attached ? (
          <div className="relative">
            <PhotoImage
              photoId={attached.id}
              dataUrl={attached.dataUrl}
              alt={attached.name}
              className="block h-auto w-full"
            />
            {attached.callouts.length > 0 && (
              <CalloutOverlay callouts={attached.callouts} />
            )}
            <button
              onClick={() => go("photo-detail", { contextId: attached.id })}
              className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur"
            >
              View / Edit
            </button>
          </div>
        ) : (
          <div>
            {fallback || (
              <div className="flex aspect-video items-center justify-center text-muted-foreground">
                <ImageOff size={32} />
              </div>
            )}
            <div className="border-t border-border bg-background/40 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">
                Built-in reference illustration. Add your own photo for a real
                equipment view.
              </p>
            </div>
          </div>
        )}
      </div>

      {!attached && (
        <Button
          onClick={() => go("my-photos")}
          variant="outline"
          className="mt-2 h-10 w-full text-xs"
        >
          <Camera size={14} className="mr-1" /> Add my photo for this section
        </Button>
      )}
    </section>
  );
}

// Render callout badges over a photo (read-only — editing happens on the
// photo detail page). Position is normalized 0..1.
function CalloutOverlay({
  callouts,
}: {
  callouts: { id: string; label: string; x: number; y: number }[];
}) {
  return (
    <>
      {callouts.map((c) => (
        <div
          key={c.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center rounded-md border border-amber-500 bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow">
              {c.label}
            </span>
            <span className="mt-0.5 block h-1.5 w-1.5 rounded-full border border-amber-500 bg-amber-500" />
          </div>
        </div>
      ))}
    </>
  );
}
