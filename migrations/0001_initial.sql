PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  website_url TEXT,
  artist_photo_cloudinary_id TEXT,
  born_year INTEGER,
  died_year INTEGER,
  nationality TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists (slug);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists (name);

CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('music', 'art', 'writing', 'performance', 'photography')),
  years_display TEXT,
  start_year INTEGER,
  start_month INTEGER,
  start_day INTEGER,
  end_year INTEGER,
  end_month INTEGER,
  end_day INTEGER,
  is_ongoing INTEGER NOT NULL DEFAULT 0 CHECK (is_ongoing IN (0, 1)),
  description TEXT,
  external_url TEXT,
  hero_image_cloudinary_id TEXT,
  status TEXT NOT NULL DEFAULT 'needs_verification' CHECK (status IN ('verified', 'needs_verification', 'needs_input')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_artworks_artist ON artworks (artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks (category);
CREATE INDEX IF NOT EXISTS idx_artworks_slug ON artworks (slug);
CREATE INDEX IF NOT EXISTS idx_artworks_start_year ON artworks (start_year);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks (status);

CREATE TABLE IF NOT EXISTS artwork_images (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  caption TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_artwork_images_artwork ON artwork_images (artwork_id, sort_order);

CREATE TABLE IF NOT EXISTS artwork_links (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link_type TEXT NOT NULL DEFAULT 'website' CHECK (link_type IN ('video', 'article', 'website', 'social')),
  platform TEXT,
  embed_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_artwork_links_artwork ON artwork_links (artwork_id, sort_order);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_relationship TEXT,
  artist_name TEXT NOT NULL,
  artist_website TEXT,
  artist_photo_cloudinary_id TEXT,
  artwork_title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('music', 'art', 'writing', 'performance', 'photography')),
  years_display TEXT,
  start_year INTEGER,
  end_year INTEGER,
  is_ongoing INTEGER NOT NULL DEFAULT 0 CHECK (is_ongoing IN (0, 1)),
  description TEXT,
  external_url TEXT,
  hero_image_cloudinary_id TEXT,
  gallery_image_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TEXT,
  approved_artist_id TEXT REFERENCES artists(id),
  approved_artwork_id TEXT REFERENCES artworks(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC);

CREATE TRIGGER IF NOT EXISTS artists_updated_at
AFTER UPDATE ON artists
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE artists
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS artworks_updated_at
AFTER UPDATE ON artworks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE artworks
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS submissions_updated_at
AFTER UPDATE ON submissions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE submissions
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;

CREATE VIEW IF NOT EXISTS timeline_entries AS
SELECT
  aw.id AS artwork_id,
  a.id AS artist_id,
  a.name AS artist_name,
  a.slug AS artist_slug,
  a.artist_photo_cloudinary_id,
  aw.title AS artwork_title,
  aw.slug AS artwork_slug,
  aw.category,
  aw.years_display,
  aw.start_year,
  aw.start_month,
  aw.start_day,
  aw.end_year,
  aw.end_month,
  aw.end_day,
  aw.is_ongoing,
  aw.hero_image_cloudinary_id,
  aw.status,
  aw.description,
  printf(
    '%04d-%02d-%02d',
    COALESCE(aw.start_year, 1900),
    COALESCE(aw.start_month, 1),
    COALESCE(aw.start_day, 1)
  ) AS computed_start_date,
  CASE
    WHEN aw.is_ongoing = 1 THEN date('now')
    WHEN aw.end_year > 2100 THEN '2100-01-01'
    WHEN aw.end_year IS NOT NULL THEN printf(
      '%04d-%02d-%02d',
      aw.end_year,
      COALESCE(aw.end_month, 12),
      min(COALESCE(aw.end_day, 28), 28)
    )
    ELSE date('now')
  END AS computed_end_date
FROM artworks aw
JOIN artists a ON a.id = aw.artist_id
WHERE aw.status != 'needs_input';
