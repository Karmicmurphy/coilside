CREATE TABLE IF NOT EXISTS coilside_state (
  profile TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coilside_state_updated_at
  ON coilside_state(updated_at);
