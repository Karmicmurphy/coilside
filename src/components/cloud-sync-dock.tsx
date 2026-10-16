"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCloudSyncStatus, initializeCloudSync, pushCloudState,
  type CloudSyncStatus,
} from "@/lib/cloud-sync";
import { readPair, PAIR_CHANGED, type PairCredentials } from "@/lib/team-pair-client";
import { useNav } from "@/lib/nav";

export function CloudSyncDock() {
  const [status, setStatus] = useState<CloudSyncStatus>(() => getCloudSyncStatus());
  const [pair, setPair] = useState<PairCredentials | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onStatus = (event: Event) => setStatus((event as CustomEvent<CloudSyncStatus>).detail);
    const onPair = () => setPair(readPair());
    onPair();
    window.addEventListener("coilside:cloud-status", onStatus);
    window.addEventListener(PAIR_CHANGED, onPair);
    return () => {
      window.removeEventListener("coilside:cloud-status", onStatus);
      window.removeEventListener(PAIR_CHANGED, onPair);
    };
  }, []);

  const busy = status.phase === "checking" || status.phase === "syncing";
  const active = status.phase === "synced";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-40 flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1.5 text-[10px] font-black uppercase shadow-lg"
        aria-label="Cloud backup status">
        {active ? <Cloud size={14} className="text-cyan-400" /> : <CloudOff size={14} className="text-amber-400" />}
        <span>{active ? "Cloud ✓" : busy ? "Syncing…" : "Cloud"}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">COILSIDE Cloud</h2>
              <button className="p-2" aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <p className="mt-2 text-sm">{status.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Your phone keeps its own hours and photos. Owner-paired cloud backup needs a connected D1 database.
              Photos stay on this phone until photo storage is added. Sean cannot read your hours.
            </p>
            {status.lastSyncedAt && <p className="mt-2 text-xs">Last sync: {new Date(status.lastSyncedAt).toLocaleString()}</p>}
            <div className="mt-4 space-y-2">
              {!pair && <Button className="h-12 w-full" onClick={() => { setOpen(false); useNav.getState().go("team-notes"); }}>Start Team Notes</Button>}
              {pair?.role === "owner" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-12" disabled={busy} onClick={() => void pushCloudState()}>
                    <Cloud size={15} className="mr-1" /> Save Now
                  </Button>
                  <Button variant="outline" className="h-12" disabled={busy} onClick={() => void initializeCloudSync(true)}>
                    <RefreshCw size={15} className="mr-1" /> Check
                  </Button>
                </div>
              )}
              {pair?.role === "sean" && <p className="text-xs text-muted-foreground">Team notes are available. Personal timecards are kept on each phone.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
