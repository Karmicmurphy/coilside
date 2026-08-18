import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CoilsideCloudBindings = {
  COILSIDE_DB?: any;
  COILSIDE_PHOTOS?: any;
};

export function getCoilsideCloudBindings(): CoilsideCloudBindings {
  try {
    return getCloudflareContext().env as unknown as CoilsideCloudBindings;
  } catch {
    // Plain `next dev` does not provide the Cloudflare runtime. Returning an
    // empty object lets the app keep working locally and report cloud sync as
    // unavailable instead of crashing.
    return {};
  }
}

export function normalizeCloudProfile(value: string | null): string | null {
  if (!value) return null;
  const profile = value.trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(profile)) return null;
  return profile;
}

export async function ensureStateTable(db: any): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS coilside_state (
        profile TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    )
    .run();
}
