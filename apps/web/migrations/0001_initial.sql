PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  profile_json TEXT NOT NULL CHECK (json_valid(profile_json)),
  rules_version TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty = 'standard'),
  constraints_json TEXT NOT NULL CHECK (json_valid(constraints_json)),
  signature TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS challenges_expiry_idx ON challenges(expires_at);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL CHECK (length(pseudonym) BETWEEN 2 AND 24),
  position TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10000),
  breakdown_json TEXT NOT NULL CHECK (json_valid(breakdown_json)),
  final_hash TEXT NOT NULL CHECK (length(final_hash) = 64),
  replay_hash TEXT NOT NULL CHECK (length(replay_hash) = 64),
  result_signature TEXT NOT NULL,
  command_count INTEGER NOT NULL CHECK (command_count >= 0),
  created_at TEXT NOT NULL,
  UNIQUE(challenge_id, replay_hash)
);

CREATE INDEX IF NOT EXISTS runs_leaderboard_idx ON runs(challenge_id, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS runs_position_idx ON runs(challenge_id, position, score DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_expiry_idx ON rate_limits(expires_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events(created_at);
