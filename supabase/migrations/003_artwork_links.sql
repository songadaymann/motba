-- Artwork Links: videos, articles, and other related resources
-- ===========================================

create type link_type as enum (
  'video',
  'article',
  'website',
  'social'
);

create table artwork_links (
  id uuid primary key default uuid_generate_v4(),
  artwork_id uuid not null references artworks(id) on delete cascade,
  url text not null,
  title text not null,
  description text,
  link_type link_type not null default 'website',
  -- Auto-detected platform: youtube, vimeo, substack, medium, wikipedia, etc.
  platform text,
  -- For video embeds: the extracted video ID
  embed_id text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_artwork_links_artwork on artwork_links (artwork_id);

-- RLS
alter table artwork_links enable row level security;

create policy "Artwork links are publicly readable"
  on artwork_links for select using (true);

create policy "Authenticated users can insert artwork_links"
  on artwork_links for insert to authenticated with check (true);

create policy "Authenticated users can update artwork_links"
  on artwork_links for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete artwork_links"
  on artwork_links for delete to authenticated using (true);
