"use client";

// Device-held capability keys. No email, password, or login screen.
// The room token is private; never put it into a normal HTTP query string.
export type PairRole = "owner" | "sean";
export type PairCredentials = {
  room: string;
  token: string;
  role: PairRole;
  seanInviteToken?: string;
};
const STORE = "coilside:team-pair-v1";
export const PAIR_CHANGED = "coilside:team-pair-changed";

export function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export function validRoom(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/.test(value);
}
export function createPrivateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function readPair(): PairCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as PairCredentials | null;
    if (saved && validRoom(saved.room) && validToken(saved.token) &&
      (saved.role === "owner" || saved.role === "sean")) return saved;
  } catch { /* corrupted local code; allow re-pairing without erasing other data */ }
  return null;
}

export function savePair(pair: PairCredentials): void {
  if (!validRoom(pair.room) || !validToken(pair.token) ||
      !["owner", "sean"].includes(pair.role)) throw new Error("Invalid team pairing");
  if (pair.seanInviteToken && !validToken(pair.seanInviteToken)) throw new Error("Invalid invitation");
  if (readPair() && readPair()?.room !== pair.room) throw new Error("This device is already paired to another workspace. Existing records were not changed.");
  localStorage.setItem(STORE, JSON.stringify(pair));
  window.dispatchEvent(new Event(PAIR_CHANGED));
}

export function pairedHeaders(extra?: Record<string,string>): Record<string,string> {
  const pair = readPair();
  if (!pair) return extra ?? {};
  return {
    "x-coilside-room": pair.room,
    "authorization": `Bearer ${pair.token}`,
    ...extra,
  };
}

export function invitationFragment(room: string, token: string, role: PairRole): string {
  return role === "sean" ? `#coilside-invite=${room}.${token}` : `#coilside-owner=${room}.${token}`;
}

export function consumeInvitation(): PairCredentials | null {
  if (typeof window === "undefined") return null;
  const match = /^#coilside-(invite|owner)=([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
  if (!match) return null;
  const [,kind,room,token] = match;
  const existing = readPair();
  // Never silently switch an existing device/role; a shared link must not
  // overwrite a worker's local time card identity.
  if (existing && (existing.room !== room || existing.role !== (kind === "owner" ? "owner" : "sean"))) {
    throw new Error("This phone already has a different team pairing. No records were replaced.");
  }
  const value: PairCredentials = existing ?? { room, token, role: kind === "owner" ? "owner" : "sean" };
  savePair(value);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return value;
}
