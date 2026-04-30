"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { HalftoneOverlay } from "@/components/HalftoneOverlay";
import { CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { getFarFutureDuration, isFarFutureWork } from "@/lib/artwork-time";

export interface HomeArtwork {
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
type WorkGroupTitle = "Past" | "Present" | "Future";
type SortKey = "length" | "start" | "end" | "type";
type SortState = Record<WorkGroupTitle, SortKey>;
type WorkGroup = {
  title: WorkGroupTitle;
  works: HomeArtwork[];
};

const DAY_MS = 1000 * 60 * 60 * 24;
const SONG_A_DAY_START_UTC = Date.UTC(2009, 0, 1);
const ABOUT_IMAGE_SRC = "/jonathan-about.jpg";
const GROUP_TITLES: WorkGroupTitle[] = ["Past", "Present", "Future"];
const DEFAULT_SORTS: SortState = {
  Past: "end",
  Present: "start",
  Future: "end",
};
const SORT_LABELS: Record<SortKey, string> = {
  length: "Length",
  start: "Start date",
  end: "End date",
  type: "Art type",
};
const NEW_YORK_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

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
  const day = artwork.end_day ?? getLastDayOfMonth(artwork.end_year, month);
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

function getDurationMs(artwork: HomeArtwork, now: Date): number | null {
  const farFutureDuration = getFarFutureDuration(artwork.slug);
  if (farFutureDuration) return Number.MAX_SAFE_INTEGER;

  const start = getStartDate(artwork);
  const end = getEndDate(artwork, now);
  if (!start || !end) return null;

  const diffMs = end.getTime() - start.getTime();
  return diffMs >= 0 ? diffMs : null;
}

function getDayCountDisplay(artwork: HomeArtwork, now: Date): string | null {
  const farFutureDuration = getFarFutureDuration(artwork.slug);
  if (farFutureDuration) return farFutureDuration.daysDisplay;

  const durationMs = getDurationMs(artwork, now);
  if (durationMs == null) return null;

  return Math.floor(durationMs / DAY_MS).toLocaleString();
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

function getSongADayCount(now: Date): string {
  const parts = NEW_YORK_DATE_FORMAT.formatToParts(now);
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const todayUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day")
  );

  return (
    Math.max(1, Math.floor((todayUtc - SONG_A_DAY_START_UTC) / DAY_MS) + 1)
  ).toLocaleString();
}

function hasHeroImage(artwork: HomeArtwork): artwork is HeroArtwork {
  return Boolean(artwork.hero_image_cloudinary_id);
}

function getSortTime(date: Date | null, fallback: number): number {
  return date?.getTime() ?? fallback;
}

function compareTitles(left: HomeArtwork, right: HomeArtwork): number {
  return left.title.localeCompare(right.title);
}

function compareBySort(
  left: HomeArtwork,
  right: HomeArtwork,
  sortKey: SortKey,
  groupTitle: WorkGroupTitle,
  now: Date
): number {
  if (sortKey === "length") {
    return (
      (getDurationMs(right, now) ?? Number.NEGATIVE_INFINITY) -
        (getDurationMs(left, now) ?? Number.NEGATIVE_INFINITY) ||
      compareTitles(left, right)
    );
  }

  if (sortKey === "start") {
    return (
      getSortTime(getStartDate(left), Number.POSITIVE_INFINITY) -
        getSortTime(getStartDate(right), Number.POSITIVE_INFINITY) ||
      compareTitles(left, right)
    );
  }

  if (sortKey === "end") {
    const leftEnd = getSortTime(getEndDate(left, now), Number.POSITIVE_INFINITY);
    const rightEnd = getSortTime(
      getEndDate(right, now),
      Number.POSITIVE_INFINITY
    );
    const comparison =
      groupTitle === "Past" ? rightEnd - leftEnd : leftEnd - rightEnd;
    return comparison || compareTitles(left, right);
  }

  return (
    CATEGORY_COLORS[left.category].label.localeCompare(
      CATEGORY_COLORS[right.category].label
    ) || compareTitles(left, right)
  );
}

function buildWorkGroups(
  artworks: HomeArtwork[],
  now: Date,
  sortState: SortState
): WorkGroup[] {
  const worksByGroup: Record<WorkGroupTitle, HomeArtwork[]> = {
    Past: artworks.filter(
      (artwork) =>
        !isPresentWork(artwork, now) && !isFutureWork(artwork, now)
    ),
    Present: artworks.filter((artwork) => isPresentWork(artwork, now)),
    Future: artworks.filter((artwork) => isFutureWork(artwork, now)),
  };

  return GROUP_TITLES.map((title) => ({
    title,
    works: worksByGroup[title]
      .slice()
      .sort((left, right) =>
        compareBySort(left, right, sortState[title], title, now)
      ),
  }));
}

function HeroCarousel({
  heroArtworks,
  initialHeroArtworkId,
  spaceMonoClassName,
}: {
  heroArtworks: HeroArtwork[];
  initialHeroArtworkId: string | null;
  spaceMonoClassName: string;
}) {
  const initialIndex = Math.max(
    heroArtworks.findIndex((artwork) => artwork.id === initialHeroArtworkId),
    0
  );
  const [heroIndex, setHeroIndex] = useState(initialIndex);
  const heroArtwork = heroArtworks[heroIndex] ?? null;
  const hasMultipleHeroes = heroArtworks.length > 1;

  if (!heroArtwork) return null;

  function moveHero(delta: number) {
    setHeroIndex((current) =>
      (current + delta + heroArtworks.length) % heroArtworks.length
    );
  }

  return (
    <section className="relative z-[2] border-b-[3px] border-[var(--riso-ink)]">
      <div className="mx-auto max-w-6xl px-8 py-6 sm:px-6 sm:py-8">
        <div className="border-[3px] border-[var(--riso-ink)]">
          <div className="relative">
            <Link
              href={`/artworks/${heroArtwork.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[2/1] lg:aspect-[8/3]">
                <Image
                  src={cloudinaryUrl(
                    heroArtwork.hero_image_cloudinary_id,
                    "hero"
                  )}
                  alt={`${heroArtwork.title} by ${heroArtwork.artists.name}`}
                  fill
                  sizes="(min-width: 1280px) 1152px, calc(100vw - 32px)"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                  unoptimized
                />
              </div>
            </Link>

            {hasMultipleHeroes && (
              <>
                <button
                  type="button"
                  onClick={() => moveHero(-1)}
                  aria-label="Previous project"
                  title="Previous project"
                  className="absolute -left-5 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-[var(--riso-ink)] opacity-65 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-[2px] focus-visible:outline-offset-4 focus-visible:outline-[var(--riso-ink)] sm:-left-10 sm:w-16 lg:-left-16 lg:w-20"
                >
                  <ArrowLeft
                    className="h-4 w-14 sm:w-16 lg:w-20"
                    strokeWidth={1.5}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => moveHero(1)}
                  aria-label="Next project"
                  title="Next project"
                  className="absolute -right-5 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-[var(--riso-ink)] opacity-65 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-[2px] focus-visible:outline-offset-4 focus-visible:outline-[var(--riso-ink)] sm:-right-10 sm:w-16 lg:-right-16 lg:w-20"
                >
                  <ArrowRight
                    className="h-4 w-14 sm:w-16 lg:w-20"
                    strokeWidth={1.5}
                  />
                </button>
              </>
            )}
          </div>

          <Link
            href={`/artworks/${heroArtwork.slug}`}
            className="group grid gap-5 border-t-[3px] border-[var(--riso-ink)] bg-[var(--riso-sage)] p-4 transition-colors hover:bg-[var(--riso-sage)]/85 sm:p-5 lg:grid-cols-[0.85fr_1.15fr]"
          >
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
                    className={`${spaceMonoClassName} text-xs font-bold text-[var(--riso-muted)]`}
                  >
                    {heroArtwork.years_display}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black uppercase leading-tight sm:text-4xl">
                {heroArtwork.artists.name}
              </h2>
              <p
                className={`${spaceMonoClassName} mt-2 text-sm font-bold text-[var(--riso-muted)]`}
              >
                {heroArtwork.title}
              </p>
            </div>

            <p
              className={`${spaceMonoClassName} text-sm font-bold leading-relaxed text-[var(--riso-ink)]/85 sm:text-base`}
            >
              {getHeroCopy(heroArtwork.description)}
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}

function WorkListItem({
  artwork,
  now,
  spaceMonoClassName,
}: {
  artwork: HomeArtwork;
  now: Date;
  spaceMonoClassName: string;
}) {
  const cat = CATEGORY_COLORS[artwork.category];
  const days = getDayCountDisplay(artwork, now);

  return (
    <Link
      href={`/artworks/${artwork.slug}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4 border-b-[2px] border-[var(--riso-ink)]/20 transition-colors hover:bg-[var(--riso-ink)]/[0.04]"
    >
      <div className="min-w-0">
        <div className="mb-2 grid gap-1.5">
          <h3 className="text-sm font-black uppercase leading-tight sm:text-base">
            {artwork.title}
          </h3>
          <span
            className="w-fit border-[2px] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]"
            style={{
              borderColor: cat.bg,
              color: cat.bg,
            }}
          >
            {cat.label}
          </span>
        </div>
        <p
          className={`${spaceMonoClassName} text-xs font-bold leading-relaxed text-[var(--riso-muted)]`}
        >
          {artwork.artists.name}
          {artwork.years_display && ` / ${artwork.years_display}`}
        </p>
      </div>

      {days != null && (
        <div className="shrink-0 text-right">
          <div className="text-base font-black sm:text-lg">{days}</div>
          <div className="text-[10px] font-black tracking-[0.1em] text-[var(--riso-muted)]">
            DAYS{isPresentWork(artwork, now) ? " +" : ""}
          </div>
        </div>
      )}
    </Link>
  );
}

function SortMenu({
  groupTitle,
  value,
  onChange,
  spaceMonoClassName,
}: {
  groupTitle: WorkGroupTitle;
  value: SortKey;
  onChange: (value: SortKey) => void;
  spaceMonoClassName: string;
}) {
  return (
    <label className="grid shrink-0 gap-1 text-right">
      <span
        className={`${spaceMonoClassName} text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--riso-muted)]`}
      >
        Sort by
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        aria-label={`Sort ${groupTitle} projects by`}
        className={`${spaceMonoClassName} h-8 w-[8.75rem] border-[2px] border-[var(--riso-ink)] bg-[var(--riso-sage)] px-2 text-xs font-bold text-[var(--riso-ink)] outline-none transition focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--riso-ink)]`}
      >
        {Object.entries(SORT_LABELS).map(([sortKey, label]) => (
          <option key={sortKey} value={sortKey}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AboutSection({
  songADayCount,
  spaceMonoClassName,
}: {
  songADayCount: string;
  spaceMonoClassName: string;
}) {
  return (
    <section
      id="about"
      className="relative z-[2] border-b-[3px] border-[var(--riso-ink)] bg-[var(--riso-ink)]/[0.04]"
    >
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
        <div className="relative aspect-[3/2] overflow-hidden border-[3px] border-[var(--riso-ink)]">
          <Image
            src={ABOUT_IMAGE_SRC}
            alt="Jonathan Mann with music gear"
            fill
            sizes="(min-width: 1024px) 520px, calc(100vw - 32px)"
            className="object-cover object-[64%_center]"
            unoptimized
          />
        </div>

        <div>
          <p
            className={`${spaceMonoClassName} mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--riso-muted)]`}
          >
            About MOTBA
          </p>
          <h2 className="mb-5 text-3xl font-black uppercase leading-none sm:text-5xl">
            A living index of time-based art
          </h2>
          <div
            className={`${spaceMonoClassName} grid gap-4 text-sm font-bold leading-relaxed text-[var(--riso-ink)]/85 sm:text-base`}
          >
            <p>
              Hi, I&rsquo;m Jonathan Mann. I&rsquo;m on day {songADayCount} of
              writing a Song A Day.
            </p>
            <p>
              My idea for this site is to build an exhaustive, authoritative
              compendium of every art project that uses time as part of the
              work.
            </p>
            <p>
              For the photography section, I leaned heavily on the groundwork
              already done by{" "}
              <Link
                href="/artists/jk-keller"
                className="underline decoration-[2px] underline-offset-4"
              >
                JK Keller
              </Link>
              .
            </p>
            <p>
              If you know of a project we&rsquo;re missing, please{" "}
              <Link
                href="/submit"
                className="underline decoration-[2px] underline-offset-4"
              >
                submit it
              </Link>{" "}
              or{" "}
              <a
                href="mailto:jonathan@jonathanmann.net"
                className="underline decoration-[2px] underline-offset-4"
              >
                email me
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeExperience({
  artworks,
  initialHeroArtworkId,
  generatedAt,
  spaceMonoClassName,
}: {
  artworks: HomeArtwork[];
  initialHeroArtworkId: string | null;
  generatedAt: string;
  spaceMonoClassName: string;
}) {
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORTS);
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const heroArtworks = useMemo(
    () => artworks.filter(hasHeroImage),
    [artworks]
  );
  const groups = useMemo(
    () => buildWorkGroups(artworks, now, sortState),
    [artworks, now, sortState]
  );
  const songADayCount = useMemo(() => getSongADayCount(now), [now]);

  function setGroupSort(groupTitle: WorkGroupTitle, value: SortKey) {
    setSortState((current) => ({
      ...current,
      [groupTitle]: value,
    }));
  }

  return (
    <div
      className="relative"
      style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
    >
      <HalftoneOverlay />

      <HeroCarousel
        heroArtworks={heroArtworks}
        initialHeroArtworkId={initialHeroArtworkId}
        spaceMonoClassName={spaceMonoClassName}
      />

      <section className="relative z-[2] border-b-[3px] border-[var(--riso-ink)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
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
                <div className="flex items-start justify-between gap-4 border-b-[3px] border-[var(--riso-ink)] pb-3">
                  <h3 className="text-2xl font-black uppercase leading-none">
                    {group.title}
                  </h3>
                  <SortMenu
                    groupTitle={group.title}
                    value={sortState[group.title]}
                    onChange={(value) => setGroupSort(group.title, value)}
                    spaceMonoClassName={spaceMonoClassName}
                  />
                </div>

                <div>
                  {group.works.map((artwork) => (
                    <WorkListItem
                      key={artwork.id}
                      artwork={artwork}
                      now={now}
                      spaceMonoClassName={spaceMonoClassName}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AboutSection
        songADayCount={songADayCount}
        spaceMonoClassName={spaceMonoClassName}
      />
    </div>
  );
}
