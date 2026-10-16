"use client";

import { useCallback, useEffect, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TeamRole = "owner" | "sean";
type SharedNote = {
  id: string;
  from: TeamRole;
  to: TeamRole;
  body: string;
  createdAt: number;
  readAt: number | null;
};

function displayName(role: TeamRole): string {
  return role === "owner" ? "Randy" : "Sean";
}

export function TeamNotesScreen() {
  const [role, setRole] = useState<TeamRole | null>(null);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async (showBusy = true) => {
    if (showBusy) setBusy(true);
    try {
      const response = await fetch("/api/team/notes", { cache: "no-store" });
      const data = await response.json() as { error?: string; role?: TeamRole; notes?: SharedNote[] };
      if (!response.ok) throw new Error(data.error || "Unable to load team notes.");
      setRole(data.role ?? null);
      setNotes(data.notes ?? []);
      setError("");
      // Each recipient can mark incoming messages as read. Read status is
      // not used to infer anyone's location or activity.
      const unread = (data.notes ?? []).filter((note) => note.to === data.role && !note.readAt);
      if (unread.length) {
        await Promise.all(unread.map((note) =>
          fetch("/api/team/notes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: note.id }),
          }).catch(() => undefined)
        ));
      }
    } catch (err) {
      setRole(null);
      setError(err instanceof Error ? err.message : "Unable to load team notes.");
    } finally {
      if (showBusy) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(false), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function sendNote() {
    const body = draft.trim();
    if (!role || !body || sending || body.length > 2000) return;
    setSending(true);
    try {
      const response = await fetch("/api/team/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send note.");
      setDraft("");
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send note.");
      // Keep the draft so a failed network request never erases the note.
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Team Notes" subtitle="Randy ↔ Sean · Cloudflare workspace" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">
            {role ? `Signed in as ${displayName(role)} · Writing to ${displayName(role === "owner" ? "sean" : "owner")}` : "Private team conversation"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Notes are separate from the personal Sean Factor archive and time cards.
            Both team members sign in through Cloudflare Access.
          </p>
          {error ? (
            <p className="mt-3 rounded-md border border-amber-500/40 p-3 text-sm text-amber-300" role="alert">{error}</p>
          ) : null}
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
            placeholder="Leave a job note, question, or update…"
            rows={4}
            className="mt-3"
            disabled={!role}
            maxLength={2000}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{draft.length}/2000 characters</span>
            <Button disabled={!role || !draft.trim() || sending} onClick={() => void sendNote()}>
              {sending ? "Sending…" : "Send note"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-bold">Shared conversation</h2>
          <Button variant="outline" onClick={() => void refresh()} disabled={busy}>
            {busy ? "Checking…" : "Refresh"}
          </Button>
        </div>
        {role && notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team notes yet. Start the conversation above.</p>
        ) : null}
        {role && [...notes].reverse().map((note) => (
          <article key={note.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm">{displayName(note.from)} → {displayName(note.to)}</strong>
              <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{note.body}</p>
            {note.from === role ? (
              <p className="mt-2 text-xs text-muted-foreground">{note.readAt ? "Read" : "Sent"}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
