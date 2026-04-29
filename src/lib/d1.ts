import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  ArtCategory,
  Artist,
  Artwork,
  ArtworkImage,
  ArtworkLink,
  LinkType,
  TimelineEntry,
  VerificationStatus,
} from "@/types/database";

type SqlValue = string | number | null;

type ArtistWithCategories = Pick<
  Artist,
  "id" | "name" | "slug" | "bio" | "website_url" | "artist_photo_cloudinary_id"
> & {
  artworks: { category: ArtCategory }[];
};

type ArtworkListing = Pick<
  Artwork,
  | "id"
  | "title"
  | "slug"
  | "category"
  | "years_display"
  | "is_ongoing"
  | "hero_image_cloudinary_id"
> & {
  artists: { name: string; slug: string };
};

type HomeArtwork = Pick<
  Artwork,
  | "id"
  | "title"
  | "slug"
  | "category"
  | "years_display"
  | "is_ongoing"
  | "description"
  | "hero_image_cloudinary_id"
  | "start_year"
  | "start_month"
  | "start_day"
  | "end_year"
  | "end_month"
  | "end_day"
> & {
  artists: { name: string };
};

type ArtistArtwork = Pick<
  Artwork,
  | "id"
  | "title"
  | "slug"
  | "category"
  | "years_display"
  | "is_ongoing"
  | "description"
  | "hero_image_cloudinary_id"
  | "external_url"
  | "status"
  | "start_year"
  | "start_month"
  | "start_day"
  | "end_year"
  | "end_month"
  | "end_day"
> & {
  artwork_images: ArtworkImage[];
  artwork_links: ArtworkLink[];
};

type ArtistDetail = Pick<
  Artist,
  | "id"
  | "name"
  | "slug"
  | "bio"
  | "website_url"
  | "artist_photo_cloudinary_id"
  | "born_year"
  | "died_year"
  | "nationality"
> & {
  artworks: ArtistArtwork[];
};

type ArtworkDetail = Pick<
  Artwork,
  | "id"
  | "title"
  | "slug"
  | "category"
  | "years_display"
  | "start_year"
  | "start_month"
  | "start_day"
  | "end_year"
  | "end_month"
  | "end_day"
  | "is_ongoing"
  | "description"
  | "external_url"
  | "hero_image_cloudinary_id"
  | "status"
> & {
  artists: {
    id: string;
    name: string;
    slug: string;
    artist_photo_cloudinary_id: string | null;
    website_url: string | null;
  };
  artwork_images: ArtworkImage[];
  artwork_links: ArtworkLink[];
};

type ArtworkOption = {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  artistName: string;
};

type AdminArtwork = Pick<
  Artwork,
  | "id"
  | "artist_id"
  | "title"
  | "slug"
  | "category"
  | "years_display"
  | "start_year"
  | "start_month"
  | "start_day"
  | "end_year"
  | "end_month"
  | "end_day"
  | "is_ongoing"
  | "description"
  | "external_url"
  | "hero_image_cloudinary_id"
  | "status"
> & {
  artists: {
    id: string;
    name: string;
    website_url?: string | null;
  };
};

type CountSummary = {
  artists: number;
  artworks: number;
};

type ArtistSummaryRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  artist_photo_cloudinary_id: string | null;
  artwork_category: ArtCategory | null;
};

type ArtworkListingRow = {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  is_ongoing: number | boolean;
  hero_image_cloudinary_id: string | null;
  artist_name: string;
  artist_slug: string;
};

type HomeArtworkRow = {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  is_ongoing: number | boolean;
  description: string | null;
  hero_image_cloudinary_id: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  artist_name: string;
};

type ArtistRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  artist_photo_cloudinary_id: string | null;
  born_year: number | null;
  died_year: number | null;
  nationality: string | null;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
};

type ArtworkRow = {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  is_ongoing: number | boolean;
  description: string | null;
  external_url: string | null;
  hero_image_cloudinary_id: string | null;
  status: VerificationStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ArtworkImageRow = {
  id: string;
  artwork_id: string;
  cloudinary_public_id: string;
  caption: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
};

type ArtworkLinkRow = {
  id: string;
  artwork_id: string;
  url: string;
  title: string;
  description: string | null;
  link_type: LinkType;
  platform: string | null;
  embed_id: string | null;
  sort_order: number;
  created_at: string;
};

type ArtworkWithArtistRow = ArtworkRow & {
  artist_name: string;
  artist_slug: string;
  artist_photo_cloudinary_id: string | null;
  artist_website_url: string | null;
  artist_id_join: string;
};

type AdminArtworkRow = ArtworkRow & {
  artist_name: string;
  artist_website_url: string | null;
};

type CountRow = {
  count: number;
};

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toSqlValue(value: unknown): SqlValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  return JSON.stringify(value);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

function nowIso(): string {
  return new Date().toISOString();
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

function buildUpdateStatement(
  table: "artists" | "artworks" | "artwork_images" | "artwork_links",
  updates: Record<string, unknown>,
  id: string
) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;

  const columns = entries.map(([column]) => `${column} = ?`).join(", ");
  const bindings = entries.map(([, value]) => toSqlValue(value) ?? null);

  return {
    sql: `UPDATE ${table} SET ${columns} WHERE id = ?`,
    bindings: [...bindings, id] as SqlValue[],
  };
}

async function getDb(): Promise<CloudflareEnv["DB"]> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

async function all<T>(sql: string, bindings: SqlValue[] = []): Promise<T[]> {
  const db = await getDb();
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results;
}

async function first<T>(sql: string, bindings: SqlValue[] = []): Promise<T | null> {
  const db = await getDb();
  return db.prepare(sql).bind(...bindings).first<T>();
}

async function run(sql: string, bindings: SqlValue[] = []) {
  const db = await getDb();
  return db.prepare(sql).bind(...bindings).run();
}

async function batch(statements: Array<{ sql: string; bindings?: SqlValue[] }>) {
  const db = await getDb();
  return db.batch(
    statements.map(({ sql, bindings = [] }) => db.prepare(sql).bind(...bindings))
  );
}

function mapArtistRow(row: ArtistRow): Artist {
  return {
    ...row,
    is_active: normalizeBoolean(row.is_active),
  };
}

function mapArtworkRow(row: ArtworkRow): Artwork {
  return {
    ...row,
    is_ongoing: normalizeBoolean(row.is_ongoing),
  };
}

function mapArtworkImageRow(row: ArtworkImageRow): ArtworkImage {
  return row;
}

function mapArtworkLinkRow(row: ArtworkLinkRow): ArtworkLink {
  return row;
}

async function getArtistRowById(id: string): Promise<Artist | null> {
  const row = await first<ArtistRow>("SELECT * FROM artists WHERE id = ?", [id]);
  return row ? mapArtistRow(row) : null;
}

async function getArtworkRowById(id: string): Promise<Artwork | null> {
  const row = await first<ArtworkRow>("SELECT * FROM artworks WHERE id = ?", [id]);
  return row ? mapArtworkRow(row) : null;
}

async function getAdminArtworkById(id: string): Promise<AdminArtwork | null> {
  const row = await first<AdminArtworkRow>(
    `SELECT
       aw.*,
       a.name AS artist_name,
       a.website_url AS artist_website_url
     FROM artworks aw
     JOIN artists a ON a.id = aw.artist_id
     WHERE aw.id = ?`,
    [id]
  );

  if (!row) return null;

  const artwork = mapArtworkRow(row);
  return {
    ...artwork,
    artists: {
      id: artwork.artist_id,
      name: row.artist_name,
      website_url: row.artist_website_url,
    },
  };
}

async function listArtworkImagesByArtworkIds(artworkIds: string[]) {
  if (artworkIds.length === 0) return new Map<string, ArtworkImage[]>();

  const rows = await all<ArtworkImageRow>(
    `SELECT *
     FROM artwork_images
     WHERE artwork_id IN (${placeholders(artworkIds.length)})
     ORDER BY artwork_id ASC, sort_order ASC, created_at ASC`,
    artworkIds
  );

  const grouped = new Map<string, ArtworkImage[]>();
  for (const row of rows) {
    const list = grouped.get(row.artwork_id) ?? [];
    list.push(mapArtworkImageRow(row));
    grouped.set(row.artwork_id, list);
  }
  return grouped;
}

async function listArtworkLinksByArtworkIds(artworkIds: string[]) {
  if (artworkIds.length === 0) return new Map<string, ArtworkLink[]>();

  const rows = await all<ArtworkLinkRow>(
    `SELECT *
     FROM artwork_links
     WHERE artwork_id IN (${placeholders(artworkIds.length)})
     ORDER BY artwork_id ASC, sort_order ASC, created_at ASC`,
    artworkIds
  );

  const grouped = new Map<string, ArtworkLink[]>();
  for (const row of rows) {
    const list = grouped.get(row.artwork_id) ?? [];
    list.push(mapArtworkLinkRow(row));
    grouped.set(row.artwork_id, list);
  }
  return grouped;
}

export async function getHomeArtworks(): Promise<HomeArtwork[]> {
  const rows = await all<HomeArtworkRow>(
    `SELECT
       aw.id,
       aw.title,
       aw.slug,
       aw.category,
       aw.years_display,
       aw.is_ongoing,
       aw.description,
       aw.hero_image_cloudinary_id,
       aw.start_year,
       aw.start_month,
       aw.start_day,
       aw.end_year,
       aw.end_month,
       aw.end_day,
       a.name AS artist_name
     FROM artworks aw
     JOIN artists a ON a.id = aw.artist_id
     ORDER BY aw.sort_order ASC, aw.created_at ASC, aw.title ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    years_display: row.years_display,
    is_ongoing: normalizeBoolean(row.is_ongoing),
    description: row.description,
    hero_image_cloudinary_id: row.hero_image_cloudinary_id,
    start_year: row.start_year,
    start_month: row.start_month,
    start_day: row.start_day,
    end_year: row.end_year,
    end_month: row.end_month,
    end_day: row.end_day,
    artists: { name: row.artist_name },
  }));
}

export async function listArtistsForIndex(
  filterCategory?: ArtCategory
): Promise<ArtistWithCategories[]> {
  const rows = await all<ArtistSummaryRow>(
    filterCategory
      ? `SELECT
           a.id,
           a.name,
           a.slug,
           a.bio,
           a.website_url,
           a.artist_photo_cloudinary_id,
           aw.category AS artwork_category
         FROM artists a
         LEFT JOIN artworks aw ON aw.artist_id = a.id
         WHERE a.is_active = 1
           AND EXISTS (
             SELECT 1
             FROM artworks aw_filter
             WHERE aw_filter.artist_id = a.id
               AND aw_filter.category = ?
           )
         ORDER BY a.name ASC, aw.category ASC`
      : `SELECT
           a.id,
           a.name,
           a.slug,
           a.bio,
           a.website_url,
           a.artist_photo_cloudinary_id,
           aw.category AS artwork_category
         FROM artists a
         LEFT JOIN artworks aw ON aw.artist_id = a.id
         WHERE a.is_active = 1
         ORDER BY a.name ASC, aw.category ASC`,
    filterCategory ? [filterCategory] : []
  );

  const grouped = new Map<string, ArtistWithCategories>();
  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        bio: row.bio,
        website_url: row.website_url,
        artist_photo_cloudinary_id: row.artist_photo_cloudinary_id,
        artworks: [],
      });
    }

    if (row.artwork_category) {
      grouped.get(row.id)?.artworks.push({ category: row.artwork_category });
    }
  }

  return [...grouped.values()];
}

export async function listArtworksForIndex(
  filterCategory?: ArtCategory
): Promise<ArtworkListing[]> {
  const rows = await all<ArtworkListingRow>(
    `SELECT
       aw.id,
       aw.title,
       aw.slug,
       aw.category,
       aw.years_display,
       aw.is_ongoing,
       aw.hero_image_cloudinary_id,
       a.name AS artist_name,
       a.slug AS artist_slug
     FROM artworks aw
     JOIN artists a ON a.id = aw.artist_id
     ${filterCategory ? "WHERE aw.category = ?" : ""}
     ORDER BY COALESCE(aw.start_year, 999999) ASC, aw.title ASC`,
    filterCategory ? [filterCategory] : []
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    years_display: row.years_display,
    is_ongoing: normalizeBoolean(row.is_ongoing),
    hero_image_cloudinary_id: row.hero_image_cloudinary_id,
    artists: {
      name: row.artist_name,
      slug: row.artist_slug,
    },
  }));
}

export async function getArtistMetadataBySlug(slug: string) {
  return first<Pick<Artist, "name" | "bio">>(
    "SELECT name, bio FROM artists WHERE slug = ?",
    [slug]
  );
}

export async function getArtworkMetadataBySlug(slug: string) {
  return first<{
    title: string;
    description: string | null;
    artist_name: string | null;
  }>(
    `SELECT
       aw.title,
       aw.description,
       a.name AS artist_name
     FROM artworks aw
     LEFT JOIN artists a ON a.id = aw.artist_id
     WHERE aw.slug = ?`,
    [slug]
  );
}

export async function getArtistBySlug(slug: string): Promise<ArtistDetail | null> {
  const artistRow = await first<ArtistRow>("SELECT * FROM artists WHERE slug = ?", [slug]);
  if (!artistRow) return null;

  const artworkRows = await all<ArtworkRow>(
    `SELECT *
     FROM artworks
     WHERE artist_id = ?
     ORDER BY COALESCE(start_year, 999999) ASC, title ASC`,
    [artistRow.id]
  );

  const artworkIds = artworkRows.map((row) => row.id);
  const [imagesByArtworkId, linksByArtworkId] = await Promise.all([
    listArtworkImagesByArtworkIds(artworkIds),
    listArtworkLinksByArtworkIds(artworkIds),
  ]);

  return {
    id: artistRow.id,
    name: artistRow.name,
    slug: artistRow.slug,
    bio: artistRow.bio,
    website_url: artistRow.website_url,
    artist_photo_cloudinary_id: artistRow.artist_photo_cloudinary_id,
    born_year: artistRow.born_year,
    died_year: artistRow.died_year,
    nationality: artistRow.nationality,
    artworks: artworkRows.map((row) => {
      const artwork = mapArtworkRow(row);
      return {
        id: artwork.id,
        title: artwork.title,
        slug: artwork.slug,
        category: artwork.category,
        years_display: artwork.years_display,
        is_ongoing: artwork.is_ongoing,
        description: artwork.description,
        hero_image_cloudinary_id: artwork.hero_image_cloudinary_id,
        external_url: artwork.external_url,
        status: artwork.status,
        start_year: artwork.start_year,
        start_month: artwork.start_month,
        start_day: artwork.start_day,
        end_year: artwork.end_year,
        end_month: artwork.end_month,
        end_day: artwork.end_day,
        artwork_images: imagesByArtworkId.get(artwork.id) ?? [],
        artwork_links: linksByArtworkId.get(artwork.id) ?? [],
      };
    }),
  };
}

export async function getArtworkBySlug(slug: string): Promise<ArtworkDetail | null> {
  const row = await first<ArtworkWithArtistRow>(
    `SELECT
       aw.*,
       a.id AS artist_id_join,
       a.name AS artist_name,
       a.slug AS artist_slug,
       a.artist_photo_cloudinary_id,
       a.website_url AS artist_website_url
     FROM artworks aw
     JOIN artists a ON a.id = aw.artist_id
     WHERE aw.slug = ?`,
    [slug]
  );

  if (!row) return null;

  const [images, links] = await Promise.all([
    listArtworkImages(row.id),
    listArtworkLinks(row.id),
  ]);

  const artwork = mapArtworkRow(row);
  return {
    ...artwork,
    artists: {
      id: row.artist_id_join,
      name: row.artist_name,
      slug: row.artist_slug,
      artist_photo_cloudinary_id: row.artist_photo_cloudinary_id,
      website_url: row.artist_website_url,
    },
    artwork_images: images,
    artwork_links: links,
  };
}

export async function listTimelineEntries(): Promise<TimelineEntry[]> {
  const rows = await all<
    Omit<TimelineEntry, "is_ongoing"> & { is_ongoing: number | boolean }
  >(
    `SELECT *
     FROM timeline_entries
     ORDER BY computed_start_date ASC, artwork_title ASC`
  );

  return rows.map((row) => ({
    ...row,
    is_ongoing: normalizeBoolean(row.is_ongoing),
  }));
}

export async function getAdminCounts(): Promise<CountSummary> {
  const [artistCount, artworkCount] = await Promise.all([
    first<CountRow>("SELECT COUNT(*) AS count FROM artists"),
    first<CountRow>("SELECT COUNT(*) AS count FROM artworks"),
  ]);

  return {
    artists: artistCount?.count ?? 0,
    artworks: artworkCount?.count ?? 0,
  };
}

export async function listAdminArtists(): Promise<Artist[]> {
  const rows = await all<ArtistRow>("SELECT * FROM artists ORDER BY name ASC");
  return rows.map(mapArtistRow);
}

export async function listAdminArtworks(): Promise<AdminArtwork[]> {
  const rows = await all<AdminArtworkRow>(
    `SELECT
       aw.*,
       a.name AS artist_name,
       a.website_url AS artist_website_url
     FROM artworks aw
     JOIN artists a ON a.id = aw.artist_id
     ORDER BY aw.title ASC`
  );

  return rows.map((row) => {
    const artwork = mapArtworkRow(row);
    return {
      ...artwork,
      artists: {
        id: artwork.artist_id,
        name: row.artist_name,
        website_url: row.artist_website_url,
      },
    };
  });
}

export async function listArtworkOptions(): Promise<ArtworkOption[]> {
  const rows = await all<
    Pick<Artwork, "id" | "title" | "slug" | "category"> & {
      artist_name: string;
    }
  >(
    `SELECT
       aw.id,
       aw.title,
       aw.slug,
       aw.category,
       a.name AS artist_name
     FROM artworks aw
     JOIN artists a ON a.id = aw.artist_id
     ORDER BY aw.title ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    artistName: row.artist_name,
  }));
}

export async function listArtistOptions() {
  return all<Pick<Artist, "id" | "name">>(
    "SELECT id, name FROM artists ORDER BY name ASC"
  );
}

export async function listArtworkImages(artworkId: string): Promise<ArtworkImage[]> {
  const rows = await all<ArtworkImageRow>(
    `SELECT *
     FROM artwork_images
     WHERE artwork_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [artworkId]
  );
  return rows.map(mapArtworkImageRow);
}

export async function listArtworkLinks(artworkId: string): Promise<ArtworkLink[]> {
  const rows = await all<ArtworkLinkRow>(
    `SELECT *
     FROM artwork_links
     WHERE artwork_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [artworkId]
  );
  return rows.map(mapArtworkLinkRow);
}

export async function createArtist(name: string): Promise<Artist> {
  const id = crypto.randomUUID();
  const timestamp = nowIso();
  await run(
    `INSERT INTO artists (
       id,
       name,
       slug,
       is_active,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), slugify(name), 1, timestamp, timestamp]
  );

  const artist = await getArtistRowById(id);
  if (!artist) throw new Error("Failed to create artist");
  return artist;
}

export async function updateArtist(
  id: string,
  updates: Partial<
    Pick<
      Artist,
      | "name"
      | "bio"
      | "website_url"
      | "nationality"
      | "born_year"
      | "died_year"
      | "artist_photo_cloudinary_id"
      | "is_active"
    >
  >
): Promise<Artist> {
  const normalized: Record<string, unknown> = {
    name: updates.name,
    bio: updates.bio,
    website_url: updates.website_url,
    nationality: updates.nationality,
    born_year: updates.born_year,
    died_year: updates.died_year,
    artist_photo_cloudinary_id: updates.artist_photo_cloudinary_id,
    is_active: updates.is_active,
  };

  if (updates.name) {
    normalized.slug = slugify(updates.name);
  }

  const statement = buildUpdateStatement("artists", normalized, id);
  if (statement) {
    await run(statement.sql, statement.bindings);
  }

  const artist = await getArtistRowById(id);
  if (!artist) throw new Error("Artist not found");
  return artist;
}

export async function deleteArtist(id: string) {
  await run("DELETE FROM artists WHERE id = ?", [id]);
}

export async function createArtwork(artistId: string, title: string): Promise<AdminArtwork> {
  const artist = await getArtistRowById(artistId);
  if (!artist) throw new Error("Artist not found");

  const id = crypto.randomUUID();
  const timestamp = nowIso();
  const trimmedTitle = title.trim();

  await run(
    `INSERT INTO artworks (
       id,
       artist_id,
       title,
       slug,
       category,
       status,
       is_ongoing,
       sort_order,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      artistId,
      trimmedTitle,
      slugify(`${artist.name}-${trimmedTitle}`),
      "art",
      "needs_verification",
      0,
      0,
      timestamp,
      timestamp,
    ]
  );

  const artwork = await getAdminArtworkById(id);
  if (!artwork) throw new Error("Failed to create artwork");
  return artwork;
}

export async function updateArtwork(
  id: string,
  updates: Partial<
    Pick<
      Artwork,
      | "artist_id"
      | "title"
      | "category"
      | "years_display"
      | "start_year"
      | "start_month"
      | "start_day"
      | "end_year"
      | "end_month"
      | "end_day"
      | "is_ongoing"
      | "description"
      | "external_url"
      | "hero_image_cloudinary_id"
      | "status"
    >
  >
): Promise<AdminArtwork> {
  const currentArtwork = await getArtworkRowById(id);
  if (!currentArtwork) throw new Error("Artwork not found");

  const normalized: Record<string, unknown> = {
    artist_id: updates.artist_id,
    title: updates.title,
    category: updates.category,
    years_display: updates.years_display,
    start_year: updates.start_year,
    start_month: updates.start_month,
    start_day: updates.start_day,
    end_year: updates.end_year,
    end_month: updates.end_month,
    end_day: updates.end_day,
    is_ongoing: updates.is_ongoing,
    description: updates.description,
    external_url: updates.external_url,
    hero_image_cloudinary_id: updates.hero_image_cloudinary_id,
    status: updates.status,
  };

  if (updates.title !== undefined || updates.artist_id !== undefined) {
    const nextArtistId = updates.artist_id ?? currentArtwork.artist_id;
    const nextTitle = updates.title ?? currentArtwork.title;
    const nextArtist = await getArtistRowById(nextArtistId);
    if (!nextArtist) throw new Error("Artist not found");
    normalized.slug = slugify(`${nextArtist.name}-${nextTitle}`);
  }

  const statement = buildUpdateStatement("artworks", normalized, id);
  if (statement) {
    await run(statement.sql, statement.bindings);
  }

  const artwork = await getAdminArtworkById(id);
  if (!artwork) throw new Error("Artwork not found after update");
  return artwork;
}

export async function deleteArtwork(id: string) {
  await run("DELETE FROM artworks WHERE id = ?", [id]);
}

export async function createArtworkImages(
  artworkId: string,
  images: Array<{
    cloudinary_public_id: string;
    width?: number;
    height?: number;
    caption?: string;
    alt_text?: string;
  }>
): Promise<ArtworkImage[]> {
  const maxSort = await first<{ max_sort_order: number | null }>(
    "SELECT MAX(sort_order) AS max_sort_order FROM artwork_images WHERE artwork_id = ?",
    [artworkId]
  );
  const startOrder = (maxSort?.max_sort_order ?? -1) + 1;

  const statements = images.map((image, index) => ({
    sql: `INSERT INTO artwork_images (
            id,
            artwork_id,
            cloudinary_public_id,
            caption,
            alt_text,
            width,
            height,
            sort_order,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    bindings: [
      crypto.randomUUID(),
      artworkId,
      image.cloudinary_public_id,
      image.caption ?? null,
      image.alt_text ?? null,
      image.width ?? null,
      image.height ?? null,
      startOrder + index,
      nowIso(),
    ] satisfies SqlValue[],
  }));

  await batch(statements);
  return listArtworkImages(artworkId);
}

export async function updateArtworkImage(
  id: string,
  updates: Partial<Pick<ArtworkImage, "caption" | "alt_text" | "sort_order">>
): Promise<ArtworkImage> {
  const statement = buildUpdateStatement(
    "artwork_images",
    {
      caption: updates.caption,
      alt_text: updates.alt_text,
      sort_order: updates.sort_order,
    },
    id
  );

  if (statement) {
    await run(statement.sql, statement.bindings);
  }

  const image = await first<ArtworkImageRow>(
    "SELECT * FROM artwork_images WHERE id = ?",
    [id]
  );
  if (!image) throw new Error("Artwork image not found");
  return mapArtworkImageRow(image);
}

export async function deleteArtworkImage(id: string) {
  await run("DELETE FROM artwork_images WHERE id = ?", [id]);
}

export async function createArtworkLink(input: {
  artwork_id: string;
  url: string;
  title: string;
  description?: string | null;
  link_type: LinkType;
  platform?: string | null;
  embed_id?: string | null;
}): Promise<ArtworkLink> {
  const maxSort = await first<{ max_sort_order: number | null }>(
    "SELECT MAX(sort_order) AS max_sort_order FROM artwork_links WHERE artwork_id = ?",
    [input.artwork_id]
  );
  const sortOrder = (maxSort?.max_sort_order ?? -1) + 1;
  const id = crypto.randomUUID();

  await run(
    `INSERT INTO artwork_links (
       id,
       artwork_id,
       url,
       title,
       description,
       link_type,
       platform,
       embed_id,
       sort_order,
       created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.artwork_id,
      input.url,
      input.title,
      input.description ?? null,
      input.link_type,
      input.platform ?? null,
      input.embed_id ?? null,
      sortOrder,
      nowIso(),
    ]
  );

  const link = await first<ArtworkLinkRow>("SELECT * FROM artwork_links WHERE id = ?", [id]);
  if (!link) throw new Error("Failed to create artwork link");
  return mapArtworkLinkRow(link);
}

export async function updateArtworkLink(
  id: string,
  updates: Partial<
    Pick<
      ArtworkLink,
      "url" | "title" | "description" | "link_type" | "platform" | "embed_id" | "sort_order"
    >
  >
): Promise<ArtworkLink> {
  const statement = buildUpdateStatement(
    "artwork_links",
    {
      url: updates.url,
      title: updates.title,
      description: updates.description,
      link_type: updates.link_type,
      platform: updates.platform,
      embed_id: updates.embed_id,
      sort_order: updates.sort_order,
    },
    id
  );

  if (statement) {
    await run(statement.sql, statement.bindings);
  }

  const link = await first<ArtworkLinkRow>("SELECT * FROM artwork_links WHERE id = ?", [id]);
  if (!link) throw new Error("Artwork link not found");
  return mapArtworkLinkRow(link);
}

export async function deleteArtworkLink(id: string) {
  await run("DELETE FROM artwork_links WHERE id = ?", [id]);
}
