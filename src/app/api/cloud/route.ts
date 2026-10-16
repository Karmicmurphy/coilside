import { NextResponse } from "next/server";
import { authenticateTeam } from "@/lib/team-auth";
import { ensureStateTable } from "@/lib/cloud-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await authenticateTeam(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  if (actor.role !== "owner") return NextResponse.json({ error: "Team invitations do not grant access to time records." }, { status: 403 });
  await ensureStateTable(actor.db);
  const row = await actor.db.prepare("SELECT payload, updated_at FROM coilside_state WHERE profile = ?")
    .bind(actor.room).first() as { payload: string; updated_at: number } | null;
  if (!row) return NextResponse.json({ available: true, found: false }, { headers: { "cache-control": "no-store" } });
  try {
    return NextResponse.json({ available: true, found: true, state: JSON.parse(row.payload), updatedAt: row.updated_at },
      { headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "Saved state is invalid." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  const actor = await authenticateTeam(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  if (actor.role !== "owner") return NextResponse.json({ error: "Only the owner can sync hours." }, { status: 403 });

  const raw = await request.text();
  if (raw.length > 4_000_000) return NextResponse.json({ error: "Backup is too large." }, { status: 413 });
  let body: { state?: unknown; baseUpdatedAt?: unknown };
  try { body = JSON.parse(raw) as { state?: unknown; baseUpdatedAt?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || !body.state || typeof body.state !== "object" || Array.isArray(body.state) ||
    !Array.isArray((body.state as { workEntries?: unknown }).workEntries) ||
    typeof body.baseUpdatedAt !== "number" || !Number.isSafeInteger(body.baseUpdatedAt) || body.baseUpdatedAt < 0)
    return NextResponse.json({ error: "Invalid backup or version." }, { status: 400 });

  const payload = JSON.stringify(body.state);
  const conflict = () => NextResponse.json({ error: "Another device has newer data. Your phone's records were not overwritten. Export a backup and check Cloud sync." }, { status: 409 });
  await ensureStateTable(actor.db);
  const current = await actor.db.prepare("SELECT updated_at FROM coilside_state WHERE profile = ?").bind(actor.room).first() as { updated_at: number } | null;
  const stamp = Math.max(Date.now(), (current?.updated_at ?? 0) + 1);
  if (current) {
    if (current.updated_at !== body.baseUpdatedAt) return conflict();
    const result = await actor.db.prepare("UPDATE coilside_state SET payload=?,updated_at=? WHERE profile=? AND updated_at=?")
      .bind(payload,stamp,actor.room,current.updated_at).run();
    if ((result.meta?.changes ?? 0) !== 1) return conflict();
  } else {
    if (body.baseUpdatedAt !== 0) return conflict();
    const result = await actor.db.prepare("INSERT OR IGNORE INTO coilside_state(profile,payload,updated_at) VALUES(?,?,?)")
      .bind(actor.room,payload,stamp).run();
    if ((result.meta?.changes ?? 0) !== 1) return conflict();
  }
  return NextResponse.json({ available: true, saved: true, updatedAt: stamp },
    { headers: { "cache-control": "no-store" } });
}
