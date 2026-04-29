import { listArtworksForIndex } from "@/lib/d1";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_COLORS,
  CATEGORIES,
  type ArtCategory,
} from "@/lib/constants";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artworks",
  description:
    "Browse long-duration and daily-practice art projects spanning decades.",
};

interface ArtworkListing {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  is_ongoing: boolean;
  hero_image_cloudinary_id: string | null;
  artists: { name: string; slug: string };
}

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: filterCategory } = await searchParams;
  const artworks = await listArtworksForIndex(
    filterCategory && CATEGORIES.includes(filterCategory as ArtCategory)
      ? (filterCategory as ArtCategory)
      : undefined
  ) as ArtworkListing[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
        <p className="mt-2 text-muted-foreground">
          Long-duration and daily-practice art projects spanning decades.
        </p>
      </div>

      {/* Category filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/artworks">
          <Badge
            variant={!filterCategory ? "default" : "outline"}
            className="cursor-pointer text-sm"
          >
            All
          </Badge>
        </Link>
        {CATEGORIES.map((cat) => (
          <Link key={cat} href={`/artworks?category=${cat}`}>
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

      {/* Artwork grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artworks.map((artwork) => {
          const color = CATEGORY_COLORS[artwork.category];
          const imgUrl = artwork.hero_image_cloudinary_id
            ? cloudinaryUrl(artwork.hero_image_cloudinary_id, "thumbnail")
            : null;

          return (
            <Link
              key={artwork.id}
              href={`/artworks/${artwork.slug}`}
              className="group overflow-hidden rounded-lg border border-border transition-colors hover:bg-accent"
            >
              {imgUrl ? (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={imgUrl}
                    alt={artwork.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground text-sm">
                  No image
                </div>
              )}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color.bg }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {color.label}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-primary leading-tight">
                  {artwork.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {artwork.artists.name}
                </p>
                {artwork.years_display && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {artwork.years_display}
                    {artwork.is_ongoing && " (ongoing)"}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {artworks.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No artworks found.
        </p>
      )}
    </div>
  );
}
