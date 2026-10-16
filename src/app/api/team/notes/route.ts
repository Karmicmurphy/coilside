import { NextResponse } from "next/server";
import { getCoilsideCloudBindings } from "@/lib/cloud-server";
import { authenticateTeam } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

async function ensureNotesTable(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS coilside_team_notes (
    id TEXT PRIMARY KEY,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'sean')),
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('owner', 'sean')),
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER,
    CHECK (sender_role <> recipient_role)
  )`).run();
}

function unavailable() {
  return NextResponse.json({ error: "Cloudflare D1 is not connected yet." }, { status: 503 });
}

export async function GET(request: Request) {
  const actor = await authenticateTeam(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { COILSIDE_DB: db } = getCoilsideCloudBindings();
  if (!db) return unavailable();
  await ensureNotesTable(db);
  const query = await db.prepare(
    "SELECT id, sender_role, recipient_role, body, created_at, read_at FROM coilside_team_notes WHERE sender_role = ? OR recipient_role = ? ORDER BY created_at DESC LIMIT 100"
  ).bind(actor.role, actor.role).all();
  return NextResponse.json({
    role: actor.role,
    notes: (query.results ?? []).map((row: Record<string, unknown>) => ({
      id: row.id, from: row.sender_role, to: row.recipient_role, body: row.body,
      createdAt: row.created_at, readAt: row.read_at,
    })),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const actor = await authenticateTeam(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { COILSIDE_DB: db } = getCoilsideCloudBindings();
  if (!db) return unavailable();

  let payload: { body?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 6000) return NextResponse.json({ error: "Note is too long." }, { status: 413 });
    payload = JSON.parse(raw) as { body?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  }
  if (typeof payload?.body !== "string") return NextResponse.json({ error: "Note text required." }, { status: 400 });
  const body = payload.body.trim();
  if (!body || body.length > 2000) return NextResponse.json({ error: "Note must be 1–2000 characters." }, { status: 400 });

  await ensureNotesTable(db);
  const id = crypto.randomUUID();
  const recipient = actor.role === "owner" ? "sean" : "owner";
  const createdAt = Date.now();
  await db.prepare(
    "INSERT INTO coilside_team_notes (id, sender_role, recipient_role, body, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, actor.role, recipient, body, createdAt).run();
  return NextResponse.json({ saved: true, id, from: actor.role, to: recipient, createdAt }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const actor = await authenticateTeam(request);
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { COILSIDE_DB: db } = getCoilsideCloudBindings();
  if (!db) return unavailable();
  let payload: { id?: unknown };
  try { payload = await request.json() as { id?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid note." }, { status: 400 }); }
  if (typeof payload?.id !== "string" || !/^[a-zA-Z0-9-]{30,60}$/.test(payload.id))
    return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  await ensureNotesTable(db);
  await db.prepare(
    "UPDATE coilside_team_notes SET read_at = COALESCE(read_at, ?) WHERE id = ? AND recipient_role = ?"
  ).bind(Date.now(), payload.id, actor.role).run();
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
