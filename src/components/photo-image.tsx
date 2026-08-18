"use client";

// PhotoImage — hydrates its src from IndexedDB when the EquipmentPhoto record
// has no inline dataUrl (the normal case once a photo has been moved to
// IndexedDB storage), and overlays the local COILSIDE evidence timestamp.
//
// Falls back to the in-record dataUrl when IndexedDB is unavailable.

import { useEffect, useState } from "react";
import { getPhotoBlob, isIndexedDBAvailable } from "@/lib/photo-blobs";
import { PhotoEvidenceStamp } from "@/components/photo-evidence-stamp";

interface PhotoImageProps {
  /** Photo id — used to look up the blob in IndexedDB */
  photoId: string;
  /** Inline data URL if present on the record (fallback path) */
  dataUrl?: string;
  alt: string;
  className?: string;
  /** Set false only when an evidence stamp would interfere with editing UI. */
  showEvidenceStamp?: boolean;
}

export function PhotoImage({
  photoId,
  dataUrl,
  alt,
  className,
  showEvidenceStamp = true,
}: PhotoImageProps) {
  // Start with the in-record dataUrl (if any) so first paint is instant.
  const [src, setSrc] = useState<string | undefined>(dataUrl);

  useEffect(() => {
    let cancelled = false;
    if (src) return;
    if (!isIndexedDBAvailable()) return;
    getPhotoBlob(photoId).then((blob) => {
      if (!cancelled && blob) setSrc(blob);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId, src]);

  if (!src) {
    return (
      <div
        className={
          "flex items-center justify-center bg-secondary text-muted-foreground " +
          (className || "")
        }
        aria-label={alt}
      >
        <span className="text-[10px] uppercase">Loading…</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img src={src} alt={alt} className={className} />
      {showEvidenceStamp && <PhotoEvidenceStamp photoId={photoId} compact />}
    </div>
  );
}
