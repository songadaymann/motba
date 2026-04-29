UPDATE artworks
SET
  years_display = '2014 - 3.343 × 10^48 years',
  start_year = COALESCE(start_year, 2014),
  start_month = COALESCE(start_month, 1),
  start_day = COALESCE(start_day, 1)
WHERE slug = '0xdesigner-310-px0-2-18-5-18-p-k-k-k';

UPDATE artworks
SET
  start_year = COALESCE(start_year, 2000),
  start_month = COALESCE(start_month, 1),
  start_day = COALESCE(start_day, 1),
  end_year = COALESCE(end_year, 3000),
  end_month = COALESCE(end_month, 1),
  end_day = COALESCE(end_day, 1)
WHERE slug = 'jem-finer-longplayer';
