"use client";

// PhotoImage — an <img> that hydrates its src from IndexedDB when the
// EquipmentPhoto record has no inline dataUrl (the normal case once a
// photo has been moved to IndexedDB storage).
//
// Falls back to the in-record dataUrl when IndexedDB is unavailable.

import { useEffect, useState } from "react";
import { getPhotoBlob, isIndexedDBAvailable } from "@/lib/photo-blobs";

interface PhotoImageProps {
  /** Photo id — used to look up the blob in IndexedDB */
  photoId: string;
  /** Inline data URL if present on the record (fallback path) */
  dataUrl?: string;
  alt: string;
  className?: string;
}

export function PhotoImage({
  photoId,
  dataUrl,
  alt,
  className,
}: PhotoImageProps) {
  // Start with the in-record dataUrl (if any) so first paint is instant.
  const [src, setSrc] = useState<string | undefined>(dataUrl);

  useEffect(() => {
    let cancelled = false;
    if (src) return; // already have an inline dataUrl
    if (!isIndexedDBAvailable()) return;
    getPhotoBlob(photoId).then((blob) => {
      if (!cancelled && blob) setSrc(blob);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId, src]);

  if (!src) {
    // Placeholder while loading or when photo bytes are missing entirely.
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
  return <img src={src} alt={alt} className={className} />;
}
