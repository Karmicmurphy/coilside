// Anonymous capability pairing for the public COILSIDE Worker.
// The *shell* is public; persisted messages and the owner's records are not.
// D1 stores only SHA-256 digests, never bearer tokens. No email login needed.
import { getCoilsideCloudBindings } from "@/lib/cloud-server";

export type TeamRole = "owner" | "sean";
export type TeamAuth =
  | { ok: true; role: TeamRole; room: string; db: any }
  | { ok: false; status: number; error: string };

export function validRoom(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/.test(value);
}
export function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export async function tokenDigest(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), x => x.toString(16).padStart(2, "0")).join("");
}

export async function ensureRoomsTable(db: any): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS coilside_rooms (
    id TEXT PRIMARY KEY,
    owner_hash TEXT NOT NULL UNIQUE,
    sean_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`).run();
}

export async function authenticateTeam(request: Request): Promise<TeamAuth> {
  const db = getCoilsideCloudBindings().COILSIDE_DB;
  if (!db) return { ok: false, status: 503, error: "Cloudflare storage is not connected. Your phone's local hours remain available." };
  const room = request.headers.get("x-coilside-room");
  const raw = request.headers.get("authorization") ?? "";
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(raw)?.[1];
  if (!validRoom(room) || !validToken(token)) {
    return { ok: false, status: 401, error: "Pair your phone to use private team notes." };
  }
  try {
    await ensureRoomsTable(db);
    const row = await db.prepare("SELECT owner_hash, sean_hash FROM coilside_rooms WHERE id = ?").bind(room).first() as
      { owner_hash: string; sean_hash: string } | null;
    if (!row) return { ok: false, status: 403, error: "Team pairing not recognized." };
    const digest = await tokenDigest(token);
    if (digest === row.owner_hash) return { ok: true, room, role: "owner", db };
    if (digest === row.sean_hash) return { ok: true, room, role: "sean", db };
    return { ok: false, status: 403, error: "This device is not paired to this workspace." };
  } catch {
    return { ok: false, status: 503, error: "Team storage is temporarily unavailable." };
  }
}
