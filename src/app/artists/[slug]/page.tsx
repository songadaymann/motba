import { getArtistBySlug, getArtistMetadataBySlug } from "@/lib/d1";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { GalleryPreview } from "@/components/GalleryPreview";
import { ImageWall } from "@/components/ImageWall";
import { ArtworkLinks } from "@/components/ArtworkLinks";
import { getFarFutureDuration } from "@/lib/artwork-time";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ArtworkImage {
  id: string;
  cloudinary_public_id: string;
  caption: string | null;
  alt_text: string | null;
  sort_order: number;
}

interface ArtworkLinkRow {
  id: string;
  url: string;
  title: string;
  description: string | null;
  link_type: string;
  platform: string | null;
  embed_id: string | null;
  sort_order: number;
}

interface ArtworkRow {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  is_ongoing: boolean;
  description: string | null;
  hero_image_cloudinary_id: string | null;
  external_url: string | null;
  status: string;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  artwork_images: ArtworkImage[];
  artwork_links: ArtworkLinkRow[];
}

function getDurationText(artwork: ArtworkRow): string | null {
  const farFutureDuration = getFarFutureDuration(artwork.slug);
  if (farFutureDuration) {
    return `${farFutureDuration.daysDisplay} days (${farFutureDuration.yearsDisplay})`;
  }

  if (!artwork.start_year || !artwork.start_month || !artwork.start_day) return null;

  const start = new Date(artwork.start_year, artwork.start_month - 1, artwork.start_day);
  let end: Date;

  if (!artwork.end_year) {
    end = new Date();
  } else if (artwork.end_month && artwork.end_day) {
    end = new Date(artwork.end_year, artwork.end_month - 1, artwork.end_day);
  } else if (artwork.end_year) {
    end = new Date(artwork.end_year, 11, 31);
  } else {
    return null;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years =
    artwork.end_year &&
    artwork.start_month === 1 &&
    artwork.start_day === 1 &&
    artwork.end_month === 1 &&
    artwork.end_day === 1
      ? artwork.end_year - artwork.start_year
      : Math.floor(days / 365.25);
  const formattedDays = days.toLocaleString();

  if (artwork.is_ongoing && !artwork.end_year) {
    if (years >= 2) {
      return `${formattedDays} days and counting (${years} years)`;
    }
    return `${formattedDays} days and counting`;
  } else {
    if (years >= 2) {
      return `${formattedDays} days (${years} years)`;
    }
    return `${formattedDays} days`;
  }
}

interface ArtistRow {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  artist_photo_cloudinary_id: string | null;
  born_year: number | null;
  died_year: number | null;
  nationality: string | null;
  artworks: ArtworkRow[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistMetadataBySlug(slug);

  if (!artist) return { title: "Artist Not Found" };

  return {
    title: artist.name,
    description: artist.bio || `Explore the long-duration work of ${artist.name}.`,
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) notFound();

  const typedArtist = artist as unknown as ArtistRow;
  const isSingleWork = typedArtist.artworks.length === 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Artist header */}
      <div className="mb-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {typedArtist.artist_photo_cloudinary_id ? (
          <img
            src={cloudinaryUrl(
              typedArtist.artist_photo_cloudinary_id,
              "artist-photo"
            )}
            alt={typedArtist.name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground">
            {typedArtist.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {typedArtist.name}
          </h1>
          {typedArtist.nationality && (
            <p className="text-sm text-muted-foreground mt-1">
              {typedArtist.nationality}
              {typedArtist.born_year && ` · b. ${typedArtist.born_year}`}
              {typedArtist.died_year && ` · d. ${typedArtist.died_year}`}
            </p>
          )}
          {typedArtist.bio && (
            <p className="mt-2 text-muted-foreground max-w-prose">
              {typedArtist.bio}
            </p>
          )}
          {typedArtist.website_url && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <GalleryPreview
                url={typedArtist.website_url}
                title={`${typedArtist.name}'s website`}
              >
                Explore website
              </GalleryPreview>
              <a
                href={typedArtist.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Visit website
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

      {isSingleWork ? (
        <SingleWorkView artwork={typedArtist.artworks[0]} />
      ) : (
        <>
          {/* Multi-work: show Works list */}
          <h2 className="mb-4 text-xl font-semibold">Works</h2>
          <div className="space-y-4">
            {typedArtist.artworks.map((artwork) => (
              <Link
                key={artwork.id}
                href={`/artworks/${artwork.slug}`}
                className="group block rounded-lg border border-border overflow-hidden transition-colors hover:bg-accent"
              >
                <div className="flex flex-col sm:flex-row">
                  {artwork.hero_image_cloudinary_id ? (
                    <div className="sm:w-48 h-40 sm:h-auto shrink-0">
                      <img
                        src={cloudinaryUrl(
                          artwork.hero_image_cloudinary_id,
                          "thumbnail"
                        )}
                        alt={artwork.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="sm:w-48 h-40 sm:h-auto shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor: CATEGORY_COLORS[artwork.category].bg + "15",
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: CATEGORY_COLORS[artwork.category].bg }}
                      >
                        {CATEGORY_COLORS[artwork.category].label}
                      </span>
                    </div>
                  )}
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold group-hover:text-primary">
                        {artwork.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs"
                        style={{
                          borderColor: CATEGORY_COLORS[artwork.category].bg,
                          color: CATEGORY_COLORS[artwork.category].bg,
                        }}
                      >
                        {CATEGORY_COLORS[artwork.category].label}
                      </Badge>
                    </div>
                    {artwork.years_display && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {artwork.years_display}
                        {artwork.is_ongoing && " (ongoing)"}
                      </p>
                    )}
                    {(() => {
                      const duration = getDurationText(artwork);
                      return duration ? (
                        <p className="mt-1 text-sm font-medium" style={{ color: CATEGORY_COLORS[artwork.category].bg }}>
                          {duration}
                        </p>
                      ) : null;
                    })()}
                    {artwork.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {artwork.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {typedArtist.artworks.length === 0 && (
        <p className="text-muted-foreground py-8">
          No works listed yet.
        </p>
      )}
    </div>
  );
}

function SingleWorkView({ artwork }: { artwork: ArtworkRow }) {
  const categoryColor = CATEGORY_COLORS[artwork.category];
  const duration = getDurationText(artwork);
  const images = [...artwork.artwork_images].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const links = [...(artwork.artwork_links || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div>
      {/* Hero image */}
      {artwork.hero_image_cloudinary_id && (
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={cloudinaryUrl(artwork.hero_image_cloudinary_id, "hero")}
            alt={artwork.title}
            className="w-full object-cover"
            style={{ aspectRatio: "16/9" }}
          />
        </div>
      )}

      {/* Title + meta */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold tracking-tight">
            <Link
              href={`/artworks/${artwork.slug}`}
              className="hover:text-primary transition-colors"
            >
              {artwork.title}
            </Link>
          </h2>
          <Badge
            variant="outline"
            style={{
              borderColor: categoryColor.bg,
              color: categoryColor.bg,
            }}
          >
            {categoryColor.label}
          </Badge>
        </div>

        {artwork.years_display && (
          <p className="text-lg text-muted-foreground">
            {artwork.years_display}
            {artwork.is_ongoing && (
              <span className="ml-2 inline-flex items-center gap-1 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Ongoing
              </span>
            )}
          </p>
        )}
        {duration && (
          <p className="mt-1 text-lg font-medium" style={{ color: categoryColor.bg }}>
            {duration}
          </p>
        )}
      </div>

      {/* Description */}
      {artwork.description && (
        <div className="mb-8 max-w-prose">
          <p className="text-foreground leading-relaxed whitespace-pre-line">
            {artwork.description}
          </p>
        </div>
      )}

      {/* Links */}
      {artwork.external_url && (
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <GalleryPreview
            url={artwork.external_url}
            title={artwork.title}
          >
            Explore project
          </GalleryPreview>
          <a
            href={artwork.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Visit project
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        </div>
      )}

      {/* Image wall for artworks with many images */}
      {images.length > 20 ? (
        <div className="mb-8">
          <ImageWall
            images={images}
            columns={10}
            fallbackAlt={artwork.title}
          />
        </div>
      ) : images.length > 0 ? (
        /* Standard gallery for fewer images */
        <div className="mb-8">
          <h3 className="mb-4 text-xl font-semibold">Gallery</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((img) => (
              <figure key={img.id} className="overflow-hidden rounded-lg">
                <img
                  src={cloudinaryUrl(img.cloudinary_public_id, "gallery")}
                  alt={img.alt_text || artwork.title}
                  className="w-full"
                />
                {img.caption && (
                  <figcaption className="mt-2 text-xs text-muted-foreground">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {/* Links: videos, articles, etc. */}
      {links.length > 0 && (
        <div className="mb-8">
          <ArtworkLinks links={links} />
        </div>
      )}
    </div>
  );
}
