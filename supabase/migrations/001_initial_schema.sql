-- MOTBA: Museum of Time Based Art - Initial Schema
-- ===========================================

create extension if not exists "uuid-ossp";

-- ===========================================
-- ENUM TYPES
-- ===========================================

create type art_category as enum (
  'music',
  'art',
  'writing',
  'performance',
  'photography'
);

create type verification_status as enum (
  'verified',
  'needs_verification',
  'needs_input'
);

create type submission_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- ===========================================
-- ARTISTS TABLE
-- ===========================================

create table artists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  bio text,
  website_url text,
  artist_photo_cloudinary_id text,
  born_year integer,
  died_year integer,
  nationality text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_artists_slug on artists (slug);
create index idx_artists_name on artists (name);

-- ===========================================
-- ARTWORKS TABLE
-- ===========================================

create table artworks (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  title text not null,
  slug text not null unique,
  category art_category not null,

  -- Display string: "2009 - now", "1972 (45 days)", etc.
  years_display text,

  -- Structured dates at whatever precision we have
  start_year integer,
  start_month integer,
  start_day integer,
  end_year integer,
  end_month integer,
  end_day integer,
  is_ongoing boolean not null default false,

  description text,
  external_url text,
  hero_image_cloudinary_id text,

  status verification_status not null default 'needs_verification',

  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_artworks_artist on artworks (artist_id);
create index idx_artworks_category on artworks (category);
create index idx_artworks_slug on artworks (slug);
create index idx_artworks_start_year on artworks (start_year);
create index idx_artworks_status on artworks (status);

-- ===========================================
-- ARTWORK IMAGES (gallery / work samples)
-- ===========================================

create table artwork_images (
  id uuid primary key default uuid_generate_v4(),
  artwork_id uuid not null references artworks(id) on delete cascade,
  cloudinary_public_id text not null,
  caption text,
  alt_text text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_artwork_images_artwork on artwork_images (artwork_id);

-- ===========================================
-- SUBMISSIONS TABLE
-- ===========================================

create table submissions (
  id uuid primary key default uuid_generate_v4(),

  submitter_name text not null,
  submitter_email text not null,
  submitter_relationship text,

  artist_name text not null,
  artist_website text,
  artist_photo_cloudinary_id text,

  artwork_title text not null,
  category art_category not null,
  years_display text,
  start_year integer,
  end_year integer,
  is_ongoing boolean default false,
  description text,
  external_url text,
  hero_image_cloudinary_id text,

  gallery_image_ids jsonb default '[]'::jsonb,

  status submission_status not null default 'pending',
  admin_notes text,
  reviewed_at timestamptz,

  approved_artist_id uuid references artists(id),
  approved_artwork_id uuid references artworks(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_submissions_status on submissions (status);
create index idx_submissions_created on submissions (created_at desc);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger artists_updated_at
  before update on artists
  for each row execute function update_updated_at();

create trigger artworks_updated_at
  before update on artworks
  for each row execute function update_updated_at();

create trigger submissions_updated_at
  before update on submissions
  for each row execute function update_updated_at();

-- ===========================================
-- TIMELINE VIEW
-- ===========================================

create or replace view timeline_entries as
select
  aw.id as artwork_id,
  a.id as artist_id,
  a.name as artist_name,
  a.slug as artist_slug,
  a.artist_photo_cloudinary_id,
  aw.title as artwork_title,
  aw.slug as artwork_slug,
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
  make_date(
    coalesce(aw.start_year, 1900),
    coalesce(aw.start_month, 1),
    coalesce(aw.start_day, 1)
  ) as computed_start_date,
  case
    when aw.is_ongoing then current_date
    when aw.end_year > 2100 then make_date(2100, 1, 1)
    when aw.end_year is not null then make_date(
      aw.end_year,
      coalesce(aw.end_month, 12),
      least(coalesce(aw.end_day, 28), 28)
    )
    else current_date
  end as computed_end_date
from artworks aw
join artists a on a.id = aw.artist_id
where aw.status != 'needs_input';

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

alter table artists enable row level security;
alter table artworks enable row level security;
alter table artwork_images enable row level security;
alter table submissions enable row level security;

-- Public read for artists, artworks, artwork_images
create policy "Artists are publicly readable"
  on artists for select using (true);

create policy "Artworks are publicly readable"
  on artworks for select using (true);

create policy "Artwork images are publicly readable"
  on artwork_images for select using (true);

-- Anyone can submit
create policy "Anyone can submit"
  on submissions for insert with check (true);

-- Service role bypasses RLS, so admin operations
-- will use the service role key
