-- Add write policies for authenticated users on admin tables
-- This allows the admin panel (which uses anon key + auth session) to modify data.

-- Artists: authenticated users can insert, update, delete
create policy "Authenticated users can insert artists"
  on artists for insert to authenticated with check (true);

create policy "Authenticated users can update artists"
  on artists for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete artists"
  on artists for delete to authenticated using (true);

-- Artworks: authenticated users can insert, update, delete
create policy "Authenticated users can insert artworks"
  on artworks for insert to authenticated with check (true);

create policy "Authenticated users can update artworks"
  on artworks for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete artworks"
  on artworks for delete to authenticated using (true);

-- Artwork images: authenticated users can insert, update, delete
create policy "Authenticated users can insert artwork_images"
  on artwork_images for insert to authenticated with check (true);

create policy "Authenticated users can update artwork_images"
  on artwork_images for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete artwork_images"
  on artwork_images for delete to authenticated using (true);

-- Submissions: authenticated users can read and update
create policy "Authenticated users can read submissions"
  on submissions for select to authenticated using (true);

create policy "Authenticated users can update submissions"
  on submissions for update to authenticated using (true) with check (true);
