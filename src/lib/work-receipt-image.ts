"use client";

import type { EquipmentPhoto, WorkEntry } from "./types";
import { getPhotoBlob } from "./photo-blobs";

export interface DailyReceiptInput {
  employerName: string;
  date: string;
  entries: WorkEntry[];
  photos: EquipmentPhoto[];
}

function photoSource(photo: EquipmentPhoto): Promise<string | null> {
  return photo.dataUrl ? Promise.resolve(photo.dataUrl) : getPhotoBlob(photo.id);
}

function decodeImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, value: string, width: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (current && ctx.measureText(candidate).width > width) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

/**
 * A portable one-day receipt; the employer receives ONLY what the owner
 * explicitly shares, never access to the owner's local photo library.
 * "Added to COILSIDE" is not a claim that gallery photos were taken then.
 */
export async function buildDailyWorkReceiptPng({ employerName, date, entries, photos }: DailyReceiptInput): Promise<Blob> {
  const sorted = [...entries].sort((a, b) => a.startAt - b.startAt);
  const files = await Promise.all(photos.map(async (photo) => {
    const src = await photoSource(photo);
    return { photo, image: src ? await decodeImage(src) : null };
  }));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this phone.");
  const width = 1200;
  const margin = 60;
  ctx.font = "28px Arial, sans-serif";
  const rowHeights = sorted.map((entry) => {
    const description = [entry.workSite, entry.note].filter(Boolean).join(" — ") || "No description entered.";
    return Math.max(145, 102 + wrap(ctx, description, width - margin * 2 - 18).length * 36);
  });
  const photoRows = Math.ceil(files.length / 3);
  const photoArea = files.length ? 105 + photoRows * 340 : 70;
  const height = 270 + rowHeights.reduce((a, b) => a + b, 0) + photoArea + 105;
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = "#12151b";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#31bdef";
  ctx.font = "bold 45px Arial, sans-serif";
  ctx.fillText("COILSIDE · WORK RECEIPT", margin, 82);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 43px Arial, sans-serif";
  ctx.fillText(employerName, margin, 142);
  ctx.font = "29px Arial, sans-serif";
  ctx.fillStyle = "#b6c1ce";
  ctx.fillText(date, margin, 193);
  const hours = sorted.reduce((total, item) => total + item.totalHours, 0);
  ctx.fillStyle = "#ffd14a";
  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText(hours.toFixed(2) + " hours worked", margin, 247);

  let y = 270;
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const rowH = rowHeights[i];
    ctx.strokeStyle = "#374151";
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(width - margin, y); ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 31px Arial, sans-serif";
    const start = new Date(e.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const stop = new Date(e.stopAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    ctx.fillText(start + " – " + stop + "   ·   " + e.totalHours.toFixed(2) + "h", margin, y + 44);
    ctx.font = "26px Arial, sans-serif";
    ctx.fillStyle = "#b6c1ce";
    ctx.fillText("Break: " + e.breakMinutes + " minutes", margin, y + 82);
    ctx.fillStyle = "#f8fafc";
    const description = [e.workSite, e.note].filter(Boolean).join(" — ") || "No description entered.";
    wrap(ctx, description, width - margin * 2 - 18).forEach((line, lineNo) => {
      ctx.fillText(line, margin, y + 119 + lineNo * 36);
    });
    y += rowH;
  }
  ctx.fillStyle = "#31bdef";
  ctx.font = "bold 34px Arial, sans-serif";
  ctx.fillText("WORK PHOTOS · " + files.length, margin, y + 58);
  y += 105;
  for (let i = 0; i < files.length; i++) {
    const { photo, image } = files[i];
    const x = margin + (i % 3) * 366;
    const py = y + Math.floor(i / 3) * 340;
    ctx.fillStyle = "#29313c";
    ctx.fillRect(x, py, 344, 264);
    if (image) drawImageCover(ctx, image, x, py, 344, 264);
    else {
      ctx.fillStyle = "#fca5a5";
      ctx.font = "24px Arial, sans-serif";
      ctx.fillText("Photo unavailable", x + 28, py + 138);
    }
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText((photo.workStage || "progress").toUpperCase(), x, py + 298);
    ctx.fillStyle = "#b6c1ce";
    ctx.font = "20px Arial, sans-serif";
    ctx.fillText("Added " + new Date(photo.createdAt).toLocaleDateString("en-US"), x, py + 326);
  }
  const footerY = y + photoRows * 340 + 30;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "22px Arial, sans-serif";
  ctx.fillText("Work times are recorded by the worker; photos are supporting documentation.", margin, footerY);
  ctx.fillText("A photo does not independently prove the hours worked.", margin, footerY + 31);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not export work receipt.")), "image/png")
  );
}

export async function shareWorkReceipt(blob: Blob, filename: string, title: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return "downloaded";
}
