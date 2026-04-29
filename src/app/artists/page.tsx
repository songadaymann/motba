import { listArtistsForIndex } from "@/lib/d1";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS, CATEGORIES, type ArtCategory } from "@/lib/constants";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artists",
  description:
    "Browse artists who have committed to long-duration and daily creative practices.",
};

interface ArtistWithCategories {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  artist_photo_cloudinary_id: string | null;
  artworks: { category: ArtCategory }[];
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: filterCategory } = await searchParams;
  const typedArtists = await listArtistsForIndex(
    filterCategory && CATEGORIES.includes(filterCategory as ArtCategory)
      ? (filterCategory as ArtCategory)
      : undefined
  ) as ArtistWithCategories[];

  // Get unique categories for each artist
  const artistsWithUniqueCategories = typedArtists.map((artist) => ({
    ...artist,
    categories: [...new Set(artist.artworks.map((a) => a.category))],
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
        <p className="mt-2 text-muted-foreground">
          Artists who have committed to long-duration and daily creative
          practices.
        </p>
      </div>

      {/* Category filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/artists">
          <Badge
            variant={!filterCategory ? "default" : "outline"}
            className="cursor-pointer text-sm"
          >
            All
          </Badge>
        </Link>
        {CATEGORIES.map((cat) => (
          <Link key={cat} href={`/artists?category=${cat}`}>
            <Badge
              variant={filterCategory === cat ? "default" : "outline"}
              className="cursor-pointer text-sm"
              style={
                filterCategory === cat
                  ? {
                      backgroundColor: CATEGORY_COLORS[cat].bg,
                      color: CATEGORY_COLORS[cat].text,
                    }
                  : undefined
              }
            >
              {CATEGORY_COLORS[cat].label}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Artist grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artistsWithUniqueCategories.map((artist) => (
          <Link
            key={artist.id}
            href={`/artists/${artist.slug}`}
            className="group rounded-lg border border-border p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-start gap-4">
              {artist.artist_photo_cloudinary_id ? (
                <img
                  src={cloudinaryUrl(
                    artist.artist_photo_cloudinary_id,
                    "artist-photo"
                  )}
                  alt={artist.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                  {artist.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold group-hover:text-primary truncate">
                  {artist.name}
                </h2>
                <div className="mt-1 flex flex-wrap gap-1">
                  {artist.categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: CATEGORY_COLORS[cat].bg + "20",
                        color: CATEGORY_COLORS[cat].bg,
                      }}
                    >
                      {CATEGORY_COLORS[cat].label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {artistsWithUniqueCategories.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No artists found.
        </p>
      )}
    </div>
  );
}
