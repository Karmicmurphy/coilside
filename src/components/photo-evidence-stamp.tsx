"use client";

import { MapPin, Clock3 } from "lucide-react";
import { useCoilsideStore } from "@/lib/store";
import { formatGps, formatTimestamp } from "@/lib/utils";

interface PhotoEvidenceStampProps {
  photoId: string;
  compact?: boolean;
  className?: string;
}

/**
 * Shows the local device timestamp recorded by COILSIDE for a saved field
 * photo, plus device-reported GPS when available. This is useful field
 * documentation, but it is not a cryptographic/tamper-proof evidence system.
 */
export function PhotoEvidenceStamp({
  photoId,
  compact = false,
  className = "",
}: PhotoEvidenceStampProps) {
  const photo = useCoilsideStore((s) =>
    s.equipmentPhotos.find((p) => p.id === photoId)
  );

  if (!photo) return null;

  const when = photo.capturedAt ?? photo.createdAt;
  const gps = formatGps(photo.latitude, photo.longitude, photo.locationAccuracy);
  const sourceLabel =
    photo.source === "camera"
      ? "Captured"
      : photo.source === "upload"
        ? "Added"
        : "Saved";

  if (compact) {
    return (
      <div
        className={`pointer-events-none absolute bottom-1 left-1 right-1 rounded bg-black/75 px-1.5 py-1 text-left text-[8px] font-semibold leading-tight text-white backdrop-blur-sm ${className}`}
      >
        <div>{sourceLabel} {formatTimestamp(when)}</div>
        {gps && <div className="truncate text-white/80">GPS {gps}</div>}
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-border bg-background/70 p-2 text-[10px] text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1">
        <Clock3 size={11} className="text-amber-400" />
        <span className="font-semibold text-foreground/90">
          {sourceLabel}: {formatTimestamp(when)}
        </span>
      </div>
      {gps && (
        <div className="mt-1 flex items-start gap-1">
          <MapPin size={11} className="mt-0.5 shrink-0 text-cyan-400" />
          <span>Device GPS: {gps}</span>
        </div>
      )}
      <p className="mt-1 text-[9px] leading-snug text-muted-foreground/80">
        Local device record. Useful for field documentation; not tamper-proof.
      </p>
    </div>
  );
}
