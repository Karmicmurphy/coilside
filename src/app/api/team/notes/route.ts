import { NextResponse } from "next/server";
import { authenticateTeam } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

async function ensureNotesTable(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS coilside_team_notes (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'sean')),
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('owner', 'sean')),
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER,
    CHECK (sender_role <> recipient_role)
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS coilside_team_notes_room_created ON coilside_team_notes(room_id, created_at DESC)").run();
}

function denied(actor: Awaited<ReturnType<typeof authenticateTeam>>) {
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  return null;
}

export async function GET(request: Request) {
  const actor = await authenticateTeam(request);
  const denial = denied(actor);
  if (denial || !actor.ok) return denial!;
  await ensureNotesTable(actor.db);
  const rows = await actor.db.prepare(
    "SELECT id, sender_role, recipient_role, body, created_at, read_at FROM coilside_team_notes WHERE room_id = ? ORDER BY created_at DESC LIMIT 100"
  ).bind(actor.room).all();
  return NextResponse.json({
    role: actor.role,
    notes: (rows.results ?? []).map((row: Record<string, unknown>) => ({
      id: row.id, from: row.sender_role, to: row.recipient_role, body: row.body,
      createdAt: row.created_at, readAt: row.read_at,
    })),
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const actor = await authenticateTeam(request);
  const denial = denied(actor);
  if (denial || !actor.ok) return denial!;
  const raw = await request.text();
  if (raw.length > 6000) return NextResponse.json({ error: "Note too long." }, { status: 413 });
  let payload: { body?: unknown };
  try { payload = JSON.parse(raw) as { body?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid note." }, { status: 400 }); }
  if (typeof payload?.body !== "string") return NextResponse.json({ error: "Note text required." }, { status: 400 });
  const body = payload.body.trim();
  if (!body || body.length > 2000) return NextResponse.json({ error: "Note must be 1–2000 characters." }, { status: 400 });
  await ensureNotesTable(actor.db);
  const id = crypto.randomUUID(), recipient = actor.role === "owner" ? "sean" : "owner", createdAt = Date.now();
  await actor.db.prepare(
    "INSERT INTO coilside_team_notes(id,room_id,sender_role,recipient_role,body,created_at) VALUES(?,?,?,?,?,?)"
  ).bind(id, actor.room, actor.role, recipient, body, createdAt).run();
  return NextResponse.json({ saved: true, id, from: actor.role, to: recipient, createdAt }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const actor = await authenticateTeam(request);
  const denial = denied(actor);
  if (denial || !actor.ok) return denial!;
  let payload: { id?: unknown };
  try { payload = await request.json() as { id?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid note." }, { status: 400 }); }
  if (typeof payload?.id !== "string" || !/^[a-zA-Z0-9-]{30,60}$/.test(payload.id))
    return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  await ensureNotesTable(actor.db);
  await actor.db.prepare(
    "UPDATE coilside_team_notes SET read_at = COALESCE(read_at, ?) WHERE id = ? AND room_id = ? AND recipient_role = ?"
  ).bind(Date.now(), payload.id, actor.room, actor.role).run();
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
