"use client";

// File-input → dataURL helpers used by the photo library.
// Photos are stored as data URLs in localStorage (a V1.1 tradeoff: simple,
// portable, no server, but limited by browser storage quota — ~5MB typical).

import { useState } from "react";

export interface ReadResult {
  dataUrl: string;
  sizeBytes: number;
  /** True if the image was downscaled to fit the size budget */
  downscaled: boolean;
}

const MAX_DIMENSION = 1280; // px
const JPEG_QUALITY = 0.78;

/**
 * Read a File (from <input type=file>) and return a downscaled JPEG data URL.
 * Falls back to the original data URL if canvas operations fail.
 */
export async function fileToPhotoDataUrl(
  file: File
): Promise<ReadResult> {
  const originalDataUrl = await readAsDataURL(file);

  // If it's already small enough, use as-is
  if (file.size < 350_000) {
    return { dataUrl: originalDataUrl, sizeBytes: file.size, downscaled: false };
  }

  try {
    const img = await loadImage(originalDataUrl);
    const { width, height } = fitWithin(img.width, img.height, MAX_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return {
      dataUrl,
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      downscaled: true,
    };
  } catch {
    return { dataUrl: originalDataUrl, sizeBytes: file.size, downscaled: false };
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  if (w >= h) {
    return { width: max, height: Math.round((h / w) * max) };
  }
  return { width: Math.round((w / h) * max), height: max };
}

/** Estimate total localStorage used by photos (bytes). */
export function estimatePhotoStorageBytes(
  photos: { dataUrl?: string }[]
): number {
  return photos.reduce(
    (acc, p) =>
      acc + (p.dataUrl ? Math.round((p.dataUrl.length * 3) / 4) : 0),
    0
  );
}

/** Reusable file-input hook. */
export function useFilePicker(
  onPicked: (file: File) => Promise<void> | void
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onPicked(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load file.");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, handleFile, clearError: () => setError(null) };
}
