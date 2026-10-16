-- Dedicated two-person notes, separate from personal Sean Factor and time records.
CREATE TABLE IF NOT EXISTS coilside_team_notes (
  id TEXT PRIMARY KEY,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'sean')),
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('owner', 'sean')),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  CHECK (sender_role <> recipient_role)
);
CREATE INDEX IF NOT EXISTS coilside_team_notes_created ON coilside_team_notes(created_at DESC);
