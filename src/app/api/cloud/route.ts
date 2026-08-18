import { NextResponse } from "next/server";
import {
  ensureStateTable,
  getCoilsideCloudBindings,
  normalizeCloudProfile,
} from "@/lib/cloud-server";

export const dynamic = "force-dynamic";

function profileFrom(request: Request): string | null {
  return normalizeCloudProfile(request.headers.get("x-coilside-profile"));
}

export async function GET(request: Request) {
  const profile = profileFrom(request);
  if (!profile) {
    return NextResponse.json({ error: "Invalid or missing sync profile." }, { status: 400 });
  }

  const { COILSIDE_DB: db } = getCoilsideCloudBindings();
  if (!db) {
    return NextResponse.json(
      { available: false, reason: "COILSIDE_DB binding is not configured." },
      { status: 503 }
    );
  }

  await ensureStateTable(db);
  const row = (await db
    .prepare("SELECT payload, updated_at FROM coilside_state WHERE profile = ?")
    .bind(profile)
    .first()) as { payload: string; updated_at: number } | null;

  if (!row) {
    return NextResponse.json({ available: true, found: false });
  }

  try {
    return NextResponse.json({
      available: true,
      found: true,
      state: JSON.parse(row.payload),
      updatedAt: row.updated_at,
    });
  } catch {
    return NextResponse.json({ error: "Stored cloud state is invalid." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const profile = profileFrom(request);
  if (!profile) {
    return NextResponse.json({ error: "Invalid or missing sync profile." }, { status: 400 });
  }

  const { COILSIDE_DB: db } = getCoilsideCloudBindings();
  if (!db) {
    return NextResponse.json(
      { available: false, reason: "COILSIDE_DB binding is not configured." },
      { status: 503 }
    );
  }

  const raw = await request.text();
  if (raw.length > 4_000_000) {
    return NextResponse.json({ error: "Cloud state payload is too large." }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!parsed || typeof parsed !== "object" || !("state" in parsed)) {
    return NextResponse.json({ error: "Missing state payload." }, { status: 400 });
  }

  const state = (parsed as { state: unknown }).state;
  const payload = JSON.stringify(state);
  const updatedAt = Date.now();

  await ensureStateTable(db);
  await db
    .prepare(
      `INSERT INTO coilside_state (profile, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(profile) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at`
    )
    .bind(profile, payload, updatedAt)
    .run();

  return NextResponse.json({ available: true, saved: true, updatedAt });
}
