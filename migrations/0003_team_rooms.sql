-- Public shell, capability-protected owner/Sean data.
CREATE TABLE IF NOT EXISTS coilside_rooms (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL UNIQUE,
  sean_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
-- Existing team notes table from 0002 needs a room partition.
-- Fresh deployment must use this schema; never silently migrate an existing
-- notes table without preserving its contents.
