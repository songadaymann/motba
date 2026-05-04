ALTER TABLE artworks
ADD COLUMN project_frequency TEXT NOT NULL DEFAULT 'daily'
CHECK (project_frequency IN ('daily', 'yearly'));

ALTER TABLE submissions
ADD COLUMN project_frequency TEXT NOT NULL DEFAULT 'daily'
CHECK (project_frequency IN ('daily', 'yearly'));

DROP VIEW IF EXISTS timeline_entries;

CREATE VIEW timeline_entries AS
SELECT
  aw.id AS artwork_id,
  a.id AS artist_id,
  a.name AS artist_name,
  a.slug AS artist_slug,
  a.artist_photo_cloudinary_id,
  aw.title AS artwork_title,
  aw.slug AS artwork_slug,
  aw.category,
  aw.project_frequency,
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
