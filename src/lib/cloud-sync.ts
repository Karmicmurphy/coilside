"use client";

import { useCoilsideStore } from "@/lib/store";
import type { CoilsideState, EquipmentPhoto } from "@/lib/types";
import { getPhotoBlob, savePhotoBlob } from "@/lib/photo-blobs";

const PROFILE_KEY = "coilside:cloud-profile";
const LAST_SYNC_KEY = "coilside:cloud-last-sync";
const DIRTY_KEY = "coilside:cloud-dirty";
const UPLOADED_PHOTOS_KEY = "coilside:cloud-uploaded-photos";

export type CloudSyncPhase =
  | "idle"
  | "checking"
  | "syncing"
  | "synced"
  | "unavailable"
  | "error";

export type CloudSyncStatus = {
  phase: CloudSyncPhase;
  message: string;
  lastSyncedAt?: number;
};

let status: CloudSyncStatus = { phase: "idle", message: "Cloud sync idle." };
let started = false;
let syncing = false;
let applyingRemote = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function emit(next: CloudSyncStatus) {
  status = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("coilside:cloud-status", { detail: next }));
  }
}

export function getCloudSyncStatus() {
  return status;
}

function newProfileId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `coilside-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getCloudProfile(): string {
  if (typeof window === "undefined") return "";
  let value = localStorage.getItem(PROFILE_KEY)?.trim();
  if (!value || !/^[A-Za-z0-9_-]{8,80}$/.test(value)) {
    value = newProfileId();
    localStorage.setItem(PROFILE_KEY, value);
  }
  return value;
}

export function setCloudProfile(profile: string): boolean {
  if (typeof window === "undefined") return false;
  const value = profile.trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(value)) return false;
  localStorage.setItem(PROFILE_KEY, value);
  localStorage.removeItem(LAST_SYNC_KEY);
  localStorage.removeItem(UPLOADED_PHOTOS_KEY);
  localStorage.setItem(DIRTY_KEY, "0");
  void initializeCloudSync(true);
  return true;
}

function cloudHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "x-coilside-profile": getCloudProfile(),
    ...extra,
  };
}

function getLastSync() {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(LAST_SYNC_KEY) || 0) || 0;
}

function setLastSync(value: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SYNC_KEY, String(value));
  localStorage.setItem(DIRTY_KEY, "0");
}

function isDirty() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DIRTY_KEY) === "1";
}

function markDirty() {
  if (typeof window === "undefined" || applyingRemote) return;
  localStorage.setItem(DIRTY_KEY, "1");
}

function uploadedPhotoIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(UPLOADED_PHOTOS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveUploadedPhotoIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(UPLOADED_PHOTOS_KEY, JSON.stringify([...ids]));
}

function stripPhotoData(state: CoilsideState): CoilsideState {
  return {
    ...state,
    equipmentPhotos: state.equipmentPhotos.map((photo) => ({
      ...photo,
      dataUrl: undefined,
    })),
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, encoded] = dataUrl.split(",", 2);
  const match = /^data:([^;]+);base64$/.exec(meta);
  if (!match || !encoded) throw new Error("Unsupported photo data URL.");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read photo."));
    reader.readAsDataURL(blob);
  });
}

async function uploadPhoto(photo: EquipmentPhoto): Promise<boolean> {
  const existing = photo.dataUrl || (await getPhotoBlob(photo.id));
  if (!existing) return false;
  const blob = dataUrlToBlob(existing);
  const response = await fetch(`/api/cloud/photos/${encodeURIComponent(photo.id)}`, {
    method: "PUT",
    headers: cloudHeaders({ "content-type": blob.type || "application/octet-stream" }),
    body: blob,
  });
  return response.ok;
}

async function uploadMissingPhotos(state: CoilsideState) {
  const uploaded = uploadedPhotoIds();
  let changed = false;
  for (const photo of state.equipmentPhotos) {
    if (uploaded.has(photo.id)) continue;
    try {
      if (await uploadPhoto(photo)) {
        uploaded.add(photo.id);
        changed = true;
      }
    } catch {
      // State sync should still succeed even if one photo cannot upload yet.
    }
  }
  if (changed) saveUploadedPhotoIds(uploaded);
}

async function hydrateRemotePhotos(state: CoilsideState) {
  for (const photo of state.equipmentPhotos) {
    if (photo.dataUrl || (await getPhotoBlob(photo.id))) continue;
    try {
      const response = await fetch(`/api/cloud/photos/${encodeURIComponent(photo.id)}`, {
        headers: cloudHeaders(),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      await savePhotoBlob(photo.id, dataUrl);
    } catch {
      // Metadata is still useful if a photo blob is temporarily unavailable.
    }
  }
}

export async function pushCloudState(): Promise<boolean> {
  if (syncing || typeof window === "undefined") return false;
  syncing = true;
  emit({ phase: "syncing", message: "Saving COILSIDE to Cloudflare…", lastSyncedAt: getLastSync() });
  try {
    const state = stripPhotoData(useCoilsideStore.getState().exportState());
    const response = await fetch("/api/cloud", {
      method: "PUT",
      headers: cloudHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ state }),
    });
    if (response.status === 503) {
      emit({ phase: "unavailable", message: "Cloud sync is ready in the app, but D1/R2 bindings are not connected yet." });
      return false;
    }
    if (!response.ok) throw new Error(`Cloud state save failed (${response.status}).`);
    const body = (await response.json()) as { updatedAt?: number };
    await uploadMissingPhotos(useCoilsideStore.getState().exportState());
    const syncedAt = body.updatedAt || Date.now();
    setLastSync(syncedAt);
    emit({ phase: "synced", message: "Cloudflare sync is up to date.", lastSyncedAt: syncedAt });
    return true;
  } catch (error) {
    emit({
      phase: "error",
      message: error instanceof Error ? error.message : "Cloud sync failed.",
      lastSyncedAt: getLastSync(),
    });
    return false;
  } finally {
    syncing = false;
  }
}

async function pullCloudState(remote: CoilsideState, updatedAt: number) {
  applyingRemote = true;
  try {
    await hydrateRemotePhotos(remote);
    useCoilsideStore.getState().importState(remote);
    setLastSync(updatedAt);
    emit({ phase: "synced", message: "Loaded the latest COILSIDE data from Cloudflare.", lastSyncedAt: updatedAt });
  } finally {
    applyingRemote = false;
  }
}

export async function initializeCloudSync(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (syncing && !force) return;
  emit({ phase: "checking", message: "Checking Cloudflare sync…", lastSyncedAt: getLastSync() });
  try {
    const response = await fetch("/api/cloud", {
      headers: cloudHeaders(),
      cache: "no-store",
    });
    if (response.status === 503) {
      emit({ phase: "unavailable", message: "Cloud sync is ready in the app, but D1/R2 bindings are not connected yet." });
      return;
    }
    if (!response.ok) throw new Error(`Cloud sync check failed (${response.status}).`);
    const body = (await response.json()) as {
      found: boolean;
      state?: CoilsideState;
      updatedAt?: number;
    };

    if (!body.found || !body.state || !body.updatedAt) {
      markDirty();
      await pushCloudState();
      return;
    }

    const lastSync = getLastSync();
    if (isDirty() && lastSync > 0) {
      await pushCloudState();
      return;
    }

    if (body.updatedAt > lastSync) {
      await pullCloudState(body.state, body.updatedAt);
      return;
    }

    emit({ phase: "synced", message: "Cloudflare sync is up to date.", lastSyncedAt: lastSync || body.updatedAt });
  } catch (error) {
    emit({
      phase: "error",
      message: error instanceof Error ? error.message : "Cloud sync check failed.",
      lastSyncedAt: getLastSync(),
    });
  }
}

function schedulePush() {
  markDirty();
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void pushCloudState();
  }, 1800);
}

export function startAutomaticCloudSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!started) {
    started = true;
    void initializeCloudSync();
    unsubscribe = useCoilsideStore.subscribe(() => {
      if (!applyingRemote) schedulePush();
    });
    const onOnline = () => void initializeCloudSync(true);
    window.addEventListener("online", onOnline);
    return () => {
      unsubscribe?.();
      unsubscribe = null;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("online", onOnline);
      started = false;
    };
  }
  return () => {};
}
