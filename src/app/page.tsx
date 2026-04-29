import { getHomeArtworks } from "@/lib/d1";
import Link from "next/link";
import Image from "next/image";
import { Space_Mono } from "next/font/google";
import { CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { getFarFutureDuration, isFarFutureWork } from "@/lib/artwork-time";
import { HalftoneOverlay } from "@/components/HalftoneOverlay";

export const dynamic = "force-dynamic";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

interface HomeArtwork {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  is_ongoing: boolean;
  description: string | null;
  hero_image_cloudinary_id: string | null;
  artists: { name: string };
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
}

type HeroArtwork = HomeArtwork & { hero_image_cloudinary_id: string };
type WorkGroup = {
  title: string;
  works: HomeArtwork[];
};

const DAY_MS = 1000 * 60 * 60 * 24;

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getStartDate(artwork: HomeArtwork): Date | null {
  if (!artwork.start_year) return null;

  const month = artwork.start_month ?? 1;
  const day = artwork.start_day ?? 1;
  return new Date(artwork.start_year, month - 1, day);
}

function isOngoingWork(artwork: HomeArtwork): boolean {
  return (
    artwork.is_ongoing ||
    artwork.years_display?.toLowerCase().includes("now") === true
  );
}

function getEndDate(artwork: HomeArtwork, now: Date): Date | null {
  if (!artwork.end_year) {
    return isOngoingWork(artwork) ? now : null;
  }

  const month = artwork.end_month ?? 12;
  const day =
    artwork.end_day ?? getLastDayOfMonth(artwork.end_year, month);
  return new Date(artwork.end_year, month - 1, day);
}

function isFutureWork(artwork: HomeArtwork, now: Date): boolean {
  if (isFarFutureWork(artwork.slug, artwork.years_display)) return true;

  const end = getEndDate(artwork, now);
  return Boolean(end && end.getTime() > now.getTime());
}

function isPresentWork(artwork: HomeArtwork, now: Date): boolean {
  return isOngoingWork(artwork) && !isFutureWork(artwork, now);
}

function getDayCountDisplay(artwork: HomeArtwork, now: Date): string | null {
  const farFutureDuration = getFarFutureDuration(artwork.slug);
  if (farFutureDuration) return farFutureDuration.daysDisplay;

  const start = getStartDate(artwork);
  const end = getEndDate(artwork, now);
  if (!start || !end) return null;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;

  return Math.floor(diffMs / DAY_MS).toLocaleString();
}

function getHeroCopy(description: string | null): string {
  const fallback =
    "Celebrating artists who commit to long-duration and daily creative practices.";
  const text = description?.replace(/\s+/g, " ").trim() || fallback;
  if (text.length <= 280) return text;

  const trimmed = text.slice(0, 280);
  const lastSentence = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?")
  );

  if (lastSentence > 140) return trimmed.slice(0, lastSentence + 1);
  return `${trimmed.replace(/\s+\S*$/, "")}...`;
}

function hasHeroImage(artwork: HomeArtwork): artwork is HeroArtwork {
  return Boolean(artwork.hero_image_cloudinary_id);
}

function pickHeroArtwork(artworks: HomeArtwork[]): HeroArtwork | null {
  const candidates = artworks.filter(hasHeroImage);
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getSortTime(date: Date | null, fallback: number): number {
  return date?.getTime() ?? fallback;
}

function compareTitles(left: HomeArtwork, right: HomeArtwork): number {
  return left.title.localeCompare(right.title);
}

function buildWorkGroups(artworks: HomeArtwork[], now: Date): WorkGroup[] {
  const past = artworks
    .filter(
      (artwork) =>
        !isPresentWork(artwork, now) && !isFutureWork(artwork, now)
    )
    .sort(
      (left, right) =>
        getSortTime(getEndDate(right, now), Number.NEGATIVE_INFINITY) -
          getSortTime(getEndDate(left, now), Number.NEGATIVE_INFINITY) ||
        compareTitles(left, right)
    );

  const present = artworks
    .filter((artwork) => isPresentWork(artwork, now))
    .sort(
      (left, right) =>
        getSortTime(getStartDate(left), Number.POSITIVE_INFINITY) -
          getSortTime(getStartDate(right), Number.POSITIVE_INFINITY) ||
        compareTitles(left, right)
    );

  const future = artworks
    .filter((artwork) => isFutureWork(artwork, now))
    .sort(
      (left, right) =>
        getSortTime(getEndDate(left, now), Number.POSITIVE_INFINITY) -
          getSortTime(getEndDate(right, now), Number.POSITIVE_INFINITY) ||
        compareTitles(left, right)
    );

  return [
    { title: "Past", works: past },
    { title: "Present", works: present },
    { title: "Future", works: future },
  ];
}

function WorkListItem({
  artwork,
  now,
}: {
  artwork: HomeArtwork;
  now: Date;
}) {
  const cat = CATEGORY_COLORS[artwork.category];
  const days = getDayCountDisplay(artwork, now);

  return (
    <Link
      href={`/artworks/${artwork.slug}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4 border-b-[2px] border-[var(--riso-ink)]/20 transition-colors hover:bg-[var(--riso-ink)]/[0.04]"
    >
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black uppercase leading-tight sm:text-base">
            {artwork.title}
          </h3>
          <span
            className="shrink-0 border-[2px] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]"
            style={{
              borderColor: cat.bg,
              color: cat.bg,
            }}
          >
            {cat.label}
          </span>
        </div>
        <p
          className={`${spaceMono.className} text-xs font-bold leading-relaxed text-[var(--riso-muted)]`}
        >
          {artwork.artists.name}
          {artwork.years_display && ` / ${artwork.years_display}`}
        </p>
      </div>

      {days != null && (
        <div className="shrink-0 text-right">
          <div className="text-base font-black sm:text-lg">
            {days}
          </div>
          <div className="text-[10px] font-black tracking-[0.1em] text-[var(--riso-muted)]">
            DAYS{isPresentWork(artwork, now) ? " +" : ""}
          </div>
        </div>
      )}
    </Link>
  );
}

export default async function HomePage() {
  const artworks = (await getHomeArtworks()) as HomeArtwork[];
  const heroArtwork = pickHeroArtwork(artworks);
  const now = new Date();
  const groups = buildWorkGroups(artworks, now);

  return (
    <div
      className="relative"
      style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
    >
      <HalftoneOverlay />

      {heroArtwork && (
        <section className="relative z-[2] border-b-[3px] border-[var(--riso-ink)]">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Link
              href={`/artworks/${heroArtwork.slug}`}
              className="group block border-[3px] border-[var(--riso-ink)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[2/1] lg:aspect-[8/3]">
                <Image
                  src={cloudinaryUrl(heroArtwork.hero_image_cloudinary_id, "hero")}
                  alt={`${heroArtwork.title} by ${heroArtwork.artists.name}`}
                  fill
                  sizes="(min-width: 1280px) 1152px, calc(100vw - 32px)"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                  unoptimized
                />
              </div>

              <div className="grid gap-5 border-t-[3px] border-[var(--riso-ink)] bg-[var(--riso-sage)] p-4 sm:p-5 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="border-[2px] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]"
                      style={{
                        borderColor: CATEGORY_COLORS[heroArtwork.category].bg,
                        color: CATEGORY_COLORS[heroArtwork.category].bg,
                      }}
                    >
                      {CATEGORY_COLORS[heroArtwork.category].label}
                    </span>
                    {heroArtwork.years_display && (
                      <span
                        className={`${spaceMono.className} text-xs font-bold text-[var(--riso-muted)]`}
                      >
                        {heroArtwork.years_display}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black uppercase leading-tight sm:text-4xl">
                    {heroArtwork.artists.name}
                  </h2>
                  <p
                    className={`${spaceMono.className} mt-2 text-sm font-bold text-[var(--riso-muted)]`}
                  >
                    {heroArtwork.title}
                  </p>
                </div>

                <p
                  className={`${spaceMono.className} text-sm font-bold leading-relaxed text-[var(--riso-ink)]/85 sm:text-base`}
                >
                  {getHeroCopy(heroArtwork.description)}
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      <section className="relative z-[2] border-b-[3px] border-[var(--riso-ink)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-7">
            <h2 className="text-xs font-black uppercase tracking-[0.3em]">
              Works By Time
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-0">
            {groups.map((group, index) => (
              <div
                key={group.title}
                className={
                  index === 0
                    ? "lg:pr-6"
                    : "border-[var(--riso-ink)]/25 lg:border-l-[2px] lg:px-6"
                }
              >
                <div className="border-b-[3px] border-[var(--riso-ink)] pb-3">
                  <h3 className="text-2xl font-black uppercase leading-none">
                    {group.title}
                  </h3>
                  <p
                    className={`${spaceMono.className} mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--riso-muted)]`}
                  >
                    {group.works.length} projects
                  </p>
                </div>

                <div>
                  {group.works.map((artwork) => (
                    <WorkListItem
                      key={artwork.id}
                      artwork={artwork}
                      now={now}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-[2] bg-[var(--riso-ink)]/[0.04]">
        <div className="mx-auto max-w-[700px] px-4 py-12 text-center sm:px-6">
          <h2 className="mb-2 text-xl font-black uppercase tracking-[0.05em] sm:text-2xl">
            Know an artist we&apos;re missing?
          </h2>
          <p
            className={`${spaceMono.className} mb-5 text-sm font-bold text-[var(--riso-muted)]`}
          >
            Help us build the most comprehensive collection of long-duration art
            projects.
          </p>
          <Link
            href="/submit"
            className="inline-flex h-11 items-center justify-center border-[3px] border-[var(--riso-ink)] bg-[var(--riso-ink)] px-7 text-xs font-black uppercase tracking-[0.15em] text-[var(--riso-sage)] transition-opacity hover:opacity-80"
          >
            Submit an Artist
          </Link>
        </div>
      </section>
    </div>
  );
}
