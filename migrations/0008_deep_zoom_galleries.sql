PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS deep_zoom_galleries (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  artwork_id TEXT REFERENCES artworks(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  manifest_key TEXT NOT NULL,
  tile_source_key TEXT NOT NULL,
  r2_prefix TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  tile_size INTEGER NOT NULL DEFAULT 254,
  overlap INTEGER NOT NULL DEFAULT 1,
  image_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(artist_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_deep_zoom_galleries_artist
ON deep_zoom_galleries (artist_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_deep_zoom_galleries_artwork
ON deep_zoom_galleries (artwork_id, is_active, sort_order);

CREATE TRIGGER IF NOT EXISTS trg_deep_zoom_galleries_updated_at
AFTER UPDATE ON deep_zoom_galleries
BEGIN
  UPDATE deep_zoom_galleries
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
