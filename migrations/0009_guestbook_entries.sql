PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 1200),
  homepage_url TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_visible_created
ON guestbook_entries (is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_ip_hash
ON guestbook_entries (ip_hash, created_at DESC);

CREATE TRIGGER IF NOT EXISTS guestbook_entries_updated_at
AFTER UPDATE ON guestbook_entries
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE guestbook_entries
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;
