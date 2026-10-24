"use client";

import { useCallback, useEffect, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  consumeInvitation, createPrivateToken, invitationFragment, pairedHeaders,
  readPair, savePair, type PairCredentials, type PairRole,
} from "@/lib/team-pair-client";
import { initializeCloudSync } from "@/lib/cloud-sync";

type Note = { id: string; from: PairRole; to: PairRole; body: string; createdAt: number; readAt: number | null };
const label = (role: PairRole) => role === "owner" ? "Randy" : "Sean";

export function TeamNotesScreen() {
  const [pair, setPair] = useState<PairCredentials | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async (showBusy = false) => {
    const current = readPair();
    if (!current) return;
    if (showBusy) setBusy(true);
    try {
      const response = await fetch("/api/team/notes", { headers: pairedHeaders(), cache: "no-store" });
      const data = await response.json() as { error?: string; role?: PairRole; notes?: Note[] };
      if (!response.ok) throw new Error(data.error || "Couldn't load the conversation.");
      if (data.role !== current.role) throw new Error("Incorrect device pairing.");
      const all = data.notes ?? [];
      setPair(current);
      setNotes(all);
      setError("");
      const unread = all.filter(n => n.to === current.role && !n.readAt);
      await Promise.all(unread.map(n => fetch("/api/team/notes", {
        method: "PATCH", headers: pairedHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ id: n.id }),
      }).catch(() => undefined)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notes.");
    } finally { if (showBusy) setBusy(false); }
  }, []);

  useEffect(() => {
    try { consumeInvitation(); }
    catch (e) { setError(e instanceof Error ? e.message : "Invalid invitation."); }
    setPair(readPair());
    void refresh(true);
    const id = setInterval(() => void refresh(), 30000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  async function createRoom() {
    if (readPair() || busy) return;
    setBusy(true); setError("");
    try {
      const ownerToken = createPrivateToken(), seanToken = createPrivateToken();
      const response = await fetch("/api/team/pair", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerToken, seanToken }),
      });
      const data = await response.json() as { room?: string; error?: string };
      if (!response.ok || !data.room) throw new Error(data.error || "Cloudflare pairing unavailable.");
      const current: PairCredentials = { role: "owner", room: data.room, token: ownerToken, seanInviteToken: seanToken };
      savePair(current);
      setPair(current);
      // Owner's local data remains authoritative until a successful first upload.
      void initializeCloudSync();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't start team notes."); }
    finally { setBusy(false); }
  }

  function linkFor(role: PairRole) {
    if (!pair || pair.role !== "owner") return "";
    const token = role === "sean" ? pair.seanInviteToken : pair.token;
    if (!token) return "";
    return `${window.location.origin}${window.location.pathname}${invitationFragment(pair.room, token, role)}`;
  }

  async function shareLink(role: PairRole) {
    const url = linkFor(role);
    if (!url) { setError("This phone does not have the original invite code."); return; }
    try {
      if (role === "sean" && navigator.share) await navigator.share({ title: "WTF Stupid Simple — Sean invite", url });
      else { await navigator.clipboard.writeText(url); setNotice(role === "sean" ? "Sean's invitation link copied." : "Owner recovery link copied. Keep it private."); }
    } catch(e) {
      if (e instanceof Error && e.name === "AbortError") return;
      try { await navigator.clipboard.writeText(url); setNotice("Private link copied."); }
      catch { setError("Sharing failed. Try again from your browser."); }
    }
  }

  async function sendNote() {
    const body = draft.trim();
    if (!pair || !body || sending || body.length > 2000) return;
    setSending(true); setError("");
    try {
      const response = await fetch("/api/team/notes", {
        method: "POST", headers: pairedHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ body }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Couldn't send note.");
      setDraft("");
      setNotice("Note sent.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't send note."); }
    finally { setSending(false); }
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Team Notes" subtitle="Randy ↔ Sean" />
      <div className="space-y-4 p-4">
        {!pair ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-bold">Notes between you and Sean</h2>
            <p className="mt-2 text-sm text-muted-foreground">No email, no accounts. Create one private link and send it to Sean. Other people can open the app but can't read this conversation without the link.</p>
            <Button className="mt-4 h-12 w-full" onClick={() => void createRoom()} disabled={busy}>
              {busy ? "Connecting…" : "Start Team Notes"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Your existing hours stay on this phone. Cloudflare storage must be connected first.</p>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="font-bold">{label(pair.role)}'s notes</p>
            <p className="mt-1 text-sm text-muted-foreground">Private two-person conversation. Updates while open; use Refresh for anything new.</p>
            {pair.role === "owner" && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Button className="h-12" onClick={() => void shareLink("sean")}>Share invitation with Sean</Button>
                <Button variant="outline" onClick={() => void shareLink("owner")}>Copy my recovery link</Button>
                <p className="text-xs text-muted-foreground">Keep recovery links private. They replace a login; anyone holding one can use that person's access.</p>
              </div>
            )}
          </section>
        )}
        {notice && <p className="text-sm text-cyan-300" role="status">{notice}</p>}
        {error && <p className="rounded-lg border border-amber-500/50 p-3 text-sm text-amber-300" role="alert">{error}</p>}
        {pair && (
          <>
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-bold">Leave a note for {label(pair.role === "owner" ? "sean" : "owner")}</h2>
              <Textarea rows={4} className="mt-3" value={draft} maxLength={2000}
                placeholder="Job address, parts, questions, updates…" onChange={e => setDraft(e.target.value.slice(0, 2000))} />
              <Button className="mt-3 h-12 w-full" disabled={!draft.trim() || sending} onClick={() => void sendNote()}>
                {sending ? "Sending…" : "Send note"}
              </Button>
            </section>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Conversation</h2>
              <Button variant="outline" onClick={() => void refresh(true)} disabled={busy}>{busy ? "Checking…" : "Refresh"}</Button>
            </div>
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            {[...notes].reverse().map(n => (
              <article key={n.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{label(n.from)} → {label(n.to)}</strong>
                  <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{n.body}</p>
                {n.from === pair.role && <p className="mt-2 text-xs text-muted-foreground">{n.readAt ? "Read" : "Sent"}</p>}
              </article>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
