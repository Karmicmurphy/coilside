"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Copy, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCloudProfile,
  getCloudSyncStatus,
  initializeCloudSync,
  pushCloudState,
  setCloudProfile,
  type CloudSyncStatus,
} from "@/lib/cloud-sync";

export function CloudSyncDock() {
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => getCloudSyncStatus());
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(() => getCloudProfile());
  const [draftProfile, setDraftProfile] = useState(() => getCloudProfile());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CloudSyncStatus>).detail;
      if (detail) setSyncStatus(detail);
    };
    window.addEventListener("coilside:cloud-status", handler);
    return () => window.removeEventListener("coilside:cloud-status", handler);
  }, []);

  const active = syncStatus.phase === "synced";
  const busy = syncStatus.phase === "checking" || syncStatus.phase === "syncing";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(profile);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function useCode() {
    if (!setCloudProfile(draftProfile)) return;
    const next = getCloudProfile();
    setProfile(next);
    setDraftProfile(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-40 flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide shadow-lg backdrop-blur"
        aria-label="Cloud sync status"
      >
        {active ? (
          <Cloud size={14} className="text-cyan-400" />
        ) : (
          <CloudOff size={14} className={busy ? "text-amber-400" : "text-muted-foreground"} />
        )}
        <span className={active ? "text-cyan-300" : busy ? "text-amber-300" : "text-muted-foreground"}>
          {active ? "Cloud ✓" : busy ? "Syncing" : "Cloud"}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Cloud size={20} className="text-cyan-400" />
                  <h2 className="text-lg font-black">COILSIDE CLOUD</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  D1 keeps your records. R2 keeps your field photos. This phone still keeps an offline copy.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Close cloud sync"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-background/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-semibold">{syncStatus.message}</p>
              {syncStatus.lastSyncedAt ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Last sync: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your sync code</p>
              <div className="mt-1 flex gap-2">
                <Input value={profile} readOnly className="h-11 font-mono text-xs" />
                <Button variant="secondary" onClick={copyCode} className="h-11 px-3">
                  <Copy size={16} className="mr-1" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Put this same code into COILSIDE on another device to use the same cloud data. Treat it like a casual password.
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-border p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Use another device&apos;s code</p>
              <Input
                value={draftProfile}
                onChange={(e) => setDraftProfile(e.target.value)}
                className="mt-1 h-11 font-mono text-xs"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <Button onClick={useCode} variant="secondary" className="mt-2 h-11 w-full">
                Link This Device
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                onClick={() => void pushCloudState()}
                disabled={busy}
                className="h-12 bg-cyan-500 text-black hover:bg-cyan-400"
              >
                <Cloud size={17} className="mr-1" /> Save Now
              </Button>
              <Button
                onClick={() => void initializeCloudSync(true)}
                disabled={busy}
                variant="secondary"
                className="h-12"
              >
                <RefreshCw size={17} className="mr-1" /> Check Cloud
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
