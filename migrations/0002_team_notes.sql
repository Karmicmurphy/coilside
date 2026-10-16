-- Private two-person conversation, partitioned by cryptographically paired room.
CREATE TABLE IF NOT EXISTS coilside_team_notes (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'sean')),
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('owner', 'sean')),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  CHECK (sender_role <> recipient_role)
);
CREATE INDEX IF NOT EXISTS coilside_team_notes_room_created ON coilside_team_notes(room_id, created_at DESC);
