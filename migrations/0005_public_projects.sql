PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
ON users (username)
WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  duration TEXT NOT NULL CHECK (duration IN ('week', 'month', 'year', 'open')),
  prompt TEXT NOT NULL CHECK (prompt IN ('song', 'poem', 'photo', 'play', 'drawing', 'dance', 'other')),
  custom_practice TEXT,
  start_date TEXT NOT NULL,
  upload_session_id TEXT NOT NULL,
  profile_image_cloudinary_id TEXT,
  hero_image_cloudinary_id TEXT,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_user_projects_user
ON user_projects (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_projects_slug
ON user_projects (slug);

CREATE TABLE IF NOT EXISTS user_project_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(project_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_user_project_entries_project
ON user_project_entries (project_id, sort_order);

CREATE TRIGGER IF NOT EXISTS user_projects_updated_at
AFTER UPDATE ON user_projects
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE user_projects
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;
