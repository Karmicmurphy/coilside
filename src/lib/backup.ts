// Export / import the full COILSIDE state as portable JSON.

import type { CoilsideState } from "./types";

const FILE_PREFIX = "coilside-backup";
const VERSION = 1;

export interface BackupFile {
  app: "coilside";
  version: number;
  exportedAt: number;
  state: CoilsideState;
}

export function buildBackup(state: CoilsideState): BackupFile {
  return {
    app: "coilside",
    version: VERSION,
    exportedAt: Date.now(),
    state,
  };
}

export function downloadBackup(state: CoilsideState) {
  const backup = buildBackup(state);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
  a.href = url;
  a.download = `${FILE_PREFIX}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackup(json: string): BackupFile {
  const obj = JSON.parse(json);
  if (!obj || obj.app !== "coilside" || !obj.state) {
    throw new Error("Not a valid COILSIDE backup file.");
  }
  return obj as BackupFile;
}
