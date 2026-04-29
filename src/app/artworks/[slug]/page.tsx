import { getArtworkBySlug, getArtworkMetadataBySlug } from "@/lib/d1";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { ImageWall } from "@/components/ImageWall";
import { ClickableGallery } from "@/components/ClickableGallery";
import { ArtworkLinks } from "@/components/ArtworkLinks";
import { ExternalEmbed } from "@/components/ExternalEmbed";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

/**
 * Server-side check: does the external_url allow iframe embedding?
 * Checks X-Frame-Options and Content-Security-Policy frame-ancestors headers.
 */
async function canEmbed(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const xfo = res.headers.get("x-frame-options");
    if (xfo) {
      const v = xfo.toUpperCase();
      if (v === "DENY" || v === "SAMEORIGIN") return false;
    }
    const csp = res.headers.get("content-security-policy");
    if (csp) {
      const match = csp.match(/frame-ancestors\s+([^;]+)/i);
      if (match) {
        const value = match[1].trim().toLowerCase();
        if (value === "'none'" || value === "'self'") return false;
      }
    }
    return true;
  } catch {
    return false; // network error → don't attempt embed
  }
}

interface ArtworkWithArtist {
  id: string;
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
  is_ongoing: boolean;
  description: string | null;
  external_url: string | null;
  hero_image_cloudinary_id: string | null;
  status: string;
  artists: {
    id: string;
    name: string;
    slug: string;
    artist_photo_cloudinary_id: string | null;
    website_url: string | null;
  };
  artwork_images: {
    id: string;
    cloudinary_public_id: string;
    caption: string | null;
    alt_text: string | null;
    sort_order: number;
  }[];
  artwork_links: {
    id: string;
    url: string;
    title: string;
    description: string | null;
    link_type: string;
    platform: string | null;
    embed_id: string | null;
    sort_order: number;
  }[];
}

function getDurationText(artwork: ArtworkWithArtist): string | null {
  if (!artwork.start_year || !artwork.start_month || !artwork.start_day) return null;

  const start = new Date(artwork.start_year, artwork.start_month - 1, artwork.start_day);
  let end: Date;

  if (artwork.is_ongoing || !artwork.end_year) {
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
  const years = Math.floor(days / 365.25);
  const formattedDays = days.toLocaleString();

  if (artwork.is_ongoing) {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkMetadataBySlug(slug);

  if (!artwork) return { title: "Artwork Not Found" };

  return {
    title: `${artwork.title} by ${artwork.artist_name || "Unknown"}`,
    description:
      artwork.description ||
      `${artwork.title} — a long-duration work by ${artwork.artist_name || "Unknown"}.`,
  };
}

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) notFound();

  const typedArtwork = artwork as unknown as ArtworkWithArtist;
  const artist = typedArtwork.artists;
  const images = [...typedArtwork.artwork_images].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const links = [...(typedArtwork.artwork_links || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const categoryColor = CATEGORY_COLORS[typedArtwork.category];

  // Server-side: check if external_url is embeddable
  const embeddable = typedArtwork.external_url
    ? await canEmbed(typedArtwork.external_url)
    : false;

  return (
    <div className="py-12">
      {/* Constrained content: breadcrumb, hero, title, description, links */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/artists" className="hover:text-foreground transition-colors">
            Artists
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/artists/${artist.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {artist.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{typedArtwork.title}</span>
        </nav>

        {/* Hero image */}
        {typedArtwork.hero_image_cloudinary_id && (
          <div className="mb-8 overflow-hidden rounded-lg">
            <img
              src={cloudinaryUrl(typedArtwork.hero_image_cloudinary_id, "hero")}
              alt={typedArtwork.title}
              className="w-full object-cover"
              style={{ aspectRatio: "16/9" }}
            />
          </div>
        )}

        {/* Title + meta */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {typedArtwork.title}
            </h1>
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

          {/* Artist link */}
          <Link
            href={`/artists/${artist.slug}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {artist.artist_photo_cloudinary_id ? (
              <img
                src={cloudinaryUrl(
                  artist.artist_photo_cloudinary_id,
                  "artist-photo"
                )}
                alt={artist.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {artist.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium">{artist.name}</span>
          </Link>

          {/* Years */}
          {typedArtwork.years_display && (
            <p className="mt-3 text-lg text-muted-foreground">
              {typedArtwork.years_display}
              {typedArtwork.is_ongoing && (
                <span className="ml-2 inline-flex items-center gap-1 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Ongoing
                </span>
              )}
            </p>
          )}
          {(() => {
            const duration = getDurationText(typedArtwork);
            return duration ? (
              <p className="mt-1 text-lg font-medium" style={{ color: categoryColor.bg }}>
                {duration}
              </p>
            ) : null;
          })()}
        </div>

        {/* Description */}
        {typedArtwork.description && (
          <div className="mb-8 max-w-prose">
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {typedArtwork.description}
            </p>
          </div>
        )}

        {/* Links */}
        {(typedArtwork.external_url || artist.website_url) && (
          <div className="mb-8 flex flex-wrap items-center gap-4">
            {typedArtwork.external_url && (
              <a
                href={typedArtwork.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Explore project
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
            )}
            {artist.website_url && (
              <a
                href={artist.website_url}
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
            )}
          </div>
        )}
      </div>

      {/* Inline embed for external_url (only if server confirmed embeddable) */}
      {typedArtwork.external_url && embeddable && (
        <div className="mb-8 mx-auto max-w-6xl px-4 sm:px-6">
          <ExternalEmbed
            url={typedArtwork.external_url}
            title={typedArtwork.title}
          />
        </div>
      )}

      {/* Gallery / Image wall — full-width, edge-to-edge */}
      {images.length > 20 ? (
        <div className="mb-8 w-full">
          <ImageWall
            images={images}
            columns={10}
            fallbackAlt={typedArtwork.title}
          />
        </div>
      ) : images.length > 0 ? (
        <div className="mb-8 w-full px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-4 text-xl font-semibold">Gallery</h2>
          </div>
          <ClickableGallery
            images={images}
            fallbackAlt={typedArtwork.title}
          />
        </div>
      ) : null}

      {/* Links: videos, articles, etc. — back to constrained */}
      {links.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-8">
          <ArtworkLinks links={links} />
        </div>
      )}
    </div>
  );
}
