"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";
import type { TimelineEntry } from "@/types/database";

const DAY_MS = 1000 * 60 * 60 * 24;
const PX_PER_DAY = 2;
const SIDE_PADDING = 96;
const EVENT_CARD_WIDTH = 290;
const EVENT_CARD_HEIGHT = 176;
const EVENT_CARD_GAP = 34;
const AXIS_Y = 430;
const MONTH_TICK_HEIGHT = 14;
const YEAR_TICK_HEIGHT = 40;

const TIMELINE_START_TEXT: Record<string, string> = {
  "roman-opalka-opalka-1-to-infinity":
    "Roman Opalka started painting consecutive numbers on canvas, speaking each number aloud and photographing himself after each session.",
  "on-kawara-date-paintings-today-series":
    "On Kawara started painting the date of the day in white letters on solid fields of color.",
  "eleanor-antin-carving-a-traditional-sculpture":
    "Eleanor Antin started photographing her body each morning as weight loss became a time-based sculpture.",
  "tom-phillips-20-sites-n-years":
    "Tom Phillips started returning to the same twenty South London sites to photograph them from fixed points each year.",
  "nicholas-nixon-the-brown-sisters":
    "Nicholas Nixon started making one annual black-and-white portrait of the Brown sisters.",
  "diego-goldberg-the-arrow-of-time":
    "Diego Goldberg started photographing each member of his family every June 17.",
  "camilo-jose-vergara-invincible-cities-tracking-time":
    "Camilo Jose Vergara started photographing the same urban locations year after year to record how cities change.",
  "friedl-kubelka-portrait-louise-anna-kubelka":
    "Friedl Kubelka started photographing her daughter every day from birth.",
  "tehching-hsieh-one-year-performance-1978-1979":
    "Tehching Hsieh started living inside a locked cell in his studio for one year.",
  "tehching-hsieh-one-year-performance-1980-1981":
    "Tehching Hsieh started punching a time clock every hour on the hour, day and night, for one year.",
  "annette-lawrence-drawing-blood-moons":
    "Annette Lawrence started recording menstrual cycle dates as drawings marked by calendar time and blood.",
  "tehching-hsieh-one-year-performance-1981-1982":
    "Tehching Hsieh started spending an entire year outside, never entering a building or shelter.",
  "tehching-hsieh-art-life-one-year-performance-1983-1984":
    "Tehching Hsieh and Linda Montano started living tied together by an eight-foot rope for one year.",
  "tehching-hsieh-one-year-performance-1985-1986":
    "Tehching Hsieh started a year of making no art, seeing no art, reading no art, and speaking no art.",
  "tehching-hsieh-1986-1999":
    "Tehching Hsieh started making art privately while withholding it from public view for thirteen years.",
  "karl-baden-every-day":
    "Karl Baden started taking a self-portrait every day.",
  "deanna-dikeman-leaving-and-waving":
    "Deanna Dikeman started photographing her parents waving goodbye from their driveway after each visit.",
  "jacques-jouet-le-poeme-du-jour-poemes-de-metro":
    "Jacques Jouet started composing one poem every day.",
  "la-monte-young-marian-zazeela-dream-house":
    "La Monte Young and Marian Zazeela started the permanent Dream House environment of sustained sound and colored light.",
  "jk-keller-the-adaption-to-my-generation":
    "JK Keller started photographing himself every day to track gradual personal change.",
  "odile-marchoul-la-photo-sculpture":
    "Odile Marchoul started making a self-portrait every day.",
  "marc-tasman-ten-years-and-one-day":
    "Marc Tasman started taking a daily self-portrait for ten years and one day.",
  "jem-finer-longplayer":
    "Jem Finer started a musical composition designed to play for one thousand years without repeating.",
  "noah-kalina-noah-k-everyday":
    "Noah Kalina started taking a self-portrait every day.",
  "ahree-lee-me":
    "Ahree Lee started taking daily self-portraits that became an internet time-lapse portrait.",
  "john-cage-as-slow-as-possible":
    "The Halberstadt performance of John Cage's organ work started stretching a score across 639 years.",
  "pete-hocking-daily-self-portraits":
    "Pete Hocking started taking a self-portrait every day.",
  "jean-michel-gobet-09h09":
    "Jean-Michel Gobet started taking a self-portrait at exactly 9:09 every morning.",
  "suzan-lori-parks-365-days-365-plays":
    "Suzan-Lori Parks started writing one new play every day for a year.",
  "alberto-frigo-2004-2040":
    "Alberto Frigo started documenting his life in minute detail, including every object used by his right hand.",
  "matt-semke-cats-will-eat-you":
    "Matt Semke started posting a new work of art online every day.",
  "beeple-mike-winkelmann-everydays-beeple":
    "Beeple started creating and posting a new digital artwork every day.",
  "jonathan-mann-song-a-day":
    "Jonathan Mann started writing and recording a new song every day.",
  "samantha-reynolds-bent-lily-poem-a-day":
    "Samantha Reynolds started writing one poem every day.",
  "jonathan-harchick-jon-drinks-water":
    "Jonathan Harchick started filming himself drinking a glass of water every day.",
  "jonathan-harchick-jon-counts-to-100k":
    "Jonathan Harchick started counting to one hundred thousand on camera.",
  "jonathan-harchick-jon-eats-carrots":
    "Jonathan Harchick started filming himself eating carrots.",
  "0xdesigner-310-px0-2-18-5-18-p-k-k-k":
    "Bull of Heaven started a piece of music designed to last 3.343 × 10^48 years.",
  "nadia-vadori-gauthier-une-minute-de-danse-par-jour":
    "Nadia Vadori-Gauthier started dancing for one filmed minute every day.",
  "hueviews-everydays-hueviews":
    "hueviews started making one piece of art every day.",
  "0xdesigner-everydays-m0dest":
    "m0dest started making one piece of art every day.",
};

type TimelineEvent = TimelineEntry & {
  startDate: Date;
  startTime: number;
  x: number;
  lane: number;
  side: "top" | "bottom";
  startText: string;
};

type Tick = {
  id: string;
  x: number;
  label?: string;
  isYear: boolean;
};

function utcDate(year: number, month = 1, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function getEntryStartDate(entry: TimelineEntry): Date {
  if (entry.artwork_slug === "0xdesigner-310-px0-2-18-5-18-p-k-k-k") {
    return utcDate(2014, 1, 1);
  }

  if (entry.start_year && entry.start_year > 0) {
    return utcDate(entry.start_year, entry.start_month ?? 1, entry.start_day ?? 1);
  }

  return new Date(`${entry.computed_start_date}T00:00:00.000Z`);
}

function daysBetween(left: Date, right: Date): number {
  return Math.round((right.getTime() - left.getTime()) / DAY_MS);
}

function getDateLabel(entry: TimelineEntry, date: Date): string {
  const year = entry.start_year && entry.start_year > 0 ? entry.start_year : date.getUTCFullYear();
  const month = entry.start_month;
  const day = entry.start_day;

  if (month && day) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  if (month) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return String(year);
}

function getStartText(entry: TimelineEntry): string {
  return (
    TIMELINE_START_TEXT[entry.artwork_slug] ??
    `${entry.artist_name} started ${entry.artwork_title}.`
  );
}

function assignLanes<T extends { x: number }>(
  events: T[],
  side: "top" | "bottom",
  laneCount: number
): Array<T & { lane: number; side: "top" | "bottom" }> {
  const laneEnds = Array.from({ length: laneCount }, () => Number.NEGATIVE_INFINITY);

  return events.map((event) => {
    let lane = laneEnds.findIndex((end) => event.x - end >= EVENT_CARD_GAP);
    if (lane === -1) {
      lane = laneEnds.indexOf(Math.min(...laneEnds));
    }

    laneEnds[lane] = event.x + EVENT_CARD_WIDTH;
    return { ...event, lane, side };
  });
}

function buildEvents(entries: TimelineEntry[]): {
  events: TimelineEvent[];
  ticks: Tick[];
  timelineWidth: number;
  startDate: Date;
  endDate: Date;
} {
  const datedEntries = entries
    .map((entry) => ({
      entry,
      startDate: getEntryStartDate(entry),
    }))
    .sort(
      (left, right) =>
        left.startDate.getTime() - right.startDate.getTime() ||
        left.entry.artwork_title.localeCompare(right.entry.artwork_title)
    );

  const earliest = datedEntries[0]?.startDate ?? utcDate(1965, 1, 1);
  const latestStart = datedEntries.at(-1)?.startDate ?? utcDate(new Date().getUTCFullYear(), 1, 1);
  const timelineStartDate = utcDate(earliest.getUTCFullYear(), 1, 1);
  const endDate = utcDate(
    Math.max(new Date().getUTCFullYear() + 1, latestStart.getUTCFullYear() + 1),
    1,
    1
  );
  const timelineWidth = Math.max(
    daysBetween(timelineStartDate, endDate) * PX_PER_DAY + SIDE_PADDING * 2,
    1600
  );

  const positioned = datedEntries.map(({ entry, startDate: entryStartDate }) => ({
    ...entry,
    startDate: entryStartDate,
    startTime: entryStartDate.getTime(),
    x: SIDE_PADDING + daysBetween(timelineStartDate, entryStartDate) * PX_PER_DAY,
    startText: getStartText(entry),
  }));

  const topSeed = positioned.filter((_, index) => index % 2 === 0);
  const bottomSeed = positioned.filter((_, index) => index % 2 === 1);
  const events = [
    ...assignLanes(topSeed, "top", 2),
    ...assignLanes(bottomSeed, "bottom", 2),
  ].sort((left, right) => left.startTime - right.startTime);

  const ticks: Tick[] = [];
  for (
    let year = timelineStartDate.getUTCFullYear();
    year <= endDate.getUTCFullYear();
    year += 1
  ) {
    for (let month = 1; month <= 12; month += 1) {
      const date = utcDate(year, month, 1);
      if (date < timelineStartDate || date > endDate) continue;
      ticks.push({
        id: `${year}-${month}`,
        x: SIDE_PADDING + daysBetween(timelineStartDate, date) * PX_PER_DAY,
        label: month === 1 ? String(year) : undefined,
        isYear: month === 1,
      });
    }
  }

  return { events, ticks, timelineWidth, startDate: timelineStartDate, endDate };
}

function getCardTop(event: TimelineEvent): number {
  if (event.side === "top") {
    return AXIS_Y - 42 - EVENT_CARD_HEIGHT - event.lane * (EVENT_CARD_HEIGHT + EVENT_CARD_GAP);
  }

  return AXIS_Y + 42 + event.lane * (EVENT_CARD_HEIGHT + EVENT_CARD_GAP);
}

function getTickHeight(event: TimelineEvent): number {
  const cardTop = getCardTop(event);
  if (event.side === "top") return AXIS_Y - (cardTop + EVENT_CARD_HEIGHT);
  return cardTop - AXIS_Y;
}

function getJumpLabel(event: TimelineEvent): string {
  return `${event.artist_name} / ${event.artwork_title}`;
}

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const category = CATEGORY_COLORS[event.category];
  const cardTop = getCardTop(event);
  const tickHeight = getTickHeight(event);
  const tickTop =
    event.side === "top" ? cardTop + EVENT_CARD_HEIGHT : AXIS_Y;
  const dateLabel = getDateLabel(event, event.startDate);

  return (
    <div
      className="absolute"
      style={{
        left: event.x,
        top: 0,
      }}
    >
      <div
        className="absolute left-0 w-px bg-[var(--riso-ink)]/45"
        style={{
          height: tickHeight,
          top: tickTop,
        }}
      />
      <div
        className="absolute left-[-4px] size-2 bg-[var(--riso-ink)]"
        style={{ top: AXIS_Y - 4 }}
      />
      <Link
        href={`/artworks/${event.artwork_slug}`}
        className="absolute block overflow-hidden border-[2px] border-[var(--riso-ink)] bg-[var(--riso-sage)] p-3 text-[var(--riso-ink)] transition-colors hover:bg-[var(--riso-ink)] hover:text-[var(--riso-sage)] focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-[var(--riso-ink)]"
        style={{
          width: EVENT_CARD_WIDTH,
          height: EVENT_CARD_HEIGHT,
          top: cardTop,
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] font-bold uppercase text-current/70">
            {dateLabel}
          </span>
          <span
            className="shrink-0 border-[2px] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]"
            style={{ borderColor: category.bg, color: category.bg }}
          >
            {category.label}
          </span>
        </div>
        <p className="line-clamp-5 text-[15px] font-black leading-tight">
          {event.startText}
        </p>
        <p className="mt-2 font-mono text-[11px] font-bold leading-relaxed text-current/60">
          {event.artwork_title}
          {event.years_display ? ` / ${event.years_display}` : ""}
        </p>
      </Link>
    </div>
  );
}

export function TimelineShell({
  entries,
  fullscreen = false,
}: {
  entries: TimelineEntry[];
  fullscreen?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCategories, setActiveCategories] = useState<Set<ArtCategory>>(new Set());
  const { events, ticks, timelineWidth, startDate } = useMemo(
    () => buildEvents(entries),
    [entries]
  );

  const visibleEvents = useMemo(() => {
    if (activeCategories.size === 0) return events;
    return events.filter((event) => activeCategories.has(event.category));
  }, [activeCategories, events]);

  const jumpYears = useMemo(
    () =>
      Array.from(new Set(visibleEvents.map((event) => event.startDate.getUTCFullYear()))).sort(
        (left, right) => left - right
      ),
    [visibleEvents]
  );

  function scrollToX(x: number) {
    scrollRef.current?.scrollTo({
      left: Math.max(0, x - 160),
      behavior: "smooth",
    });
  }

  function jumpToYear(year: string) {
    if (!year) return;
    const date = utcDate(Number(year), 1, 1);
    scrollToX(SIDE_PADDING + daysBetween(startDate, date) * PX_PER_DAY);
  }

  function jumpToProject(artworkId: string) {
    const event = events.find((item) => item.artwork_id === artworkId);
    if (event) scrollToX(event.x);
  }

  function toggleCategory(category: ArtCategory) {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div
      className={`relative bg-[var(--riso-sage)] text-[var(--riso-ink)] ${
        fullscreen ? "h-full" : "min-h-[calc(100svh-3.5rem)]"
      }`}
      style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
    >
      <div className="border-b-[3px] border-[var(--riso-ink)] bg-[var(--riso-sage)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase leading-none sm:text-3xl">
              Timeline
            </h1>
            <p className="mt-1 max-w-2xl font-mono text-xs font-bold leading-relaxed text-[var(--riso-muted)]">
              Start dates for long-duration and daily-practice works.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
            <label className="grid gap-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--riso-muted)]">
                Jump to year
              </span>
              <select
                defaultValue=""
                onChange={(event) => jumpToYear(event.target.value)}
                className="h-9 border-[2px] border-[var(--riso-ink)] bg-[var(--riso-sage)] px-2 font-mono text-xs font-bold text-[var(--riso-ink)] outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--riso-ink)]"
              >
                <option value="">Select year</option>
                {jumpYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--riso-muted)]">
                Jump to project
              </span>
              <select
                defaultValue=""
                onChange={(event) => jumpToProject(event.target.value)}
                className="h-9 border-[2px] border-[var(--riso-ink)] bg-[var(--riso-sage)] px-2 font-mono text-xs font-bold text-[var(--riso-ink)] outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--riso-ink)]"
              >
                <option value="">Select artist / work</option>
                {visibleEvents.map((event) => (
                  <option key={event.artwork_id} value={event.artwork_id}>
                    {getJumpLabel(event)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveCategories(new Set())}
            className={`shrink-0 border-[2px] px-3 py-1.5 text-xs font-black uppercase ${
              activeCategories.size === 0
                ? "border-[var(--riso-ink)] bg-[var(--riso-ink)] text-[var(--riso-sage)]"
                : "border-[var(--riso-ink)]/60 text-[var(--riso-ink)]"
            }`}
          >
            All ({events.length})
          </button>
          {CATEGORIES.map((category) => {
            const color = CATEGORY_COLORS[category];
            const isActive = activeCategories.has(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className="shrink-0 border-[2px] px-3 py-1.5 text-xs font-black uppercase"
                style={{
                  borderColor: color.bg,
                  backgroundColor: isActive ? color.bg : "transparent",
                  color: isActive ? color.text : color.bg,
                }}
              >
                {color.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden border-b-[3px] border-[var(--riso-ink)]"
      >
        <div
          className="relative h-[900px] min-w-full"
          style={{ width: timelineWidth }}
        >
          <div
            className="absolute left-0 right-0 border-t-[3px] border-[var(--riso-ink)]"
            style={{ top: AXIS_Y }}
          />

          {ticks.map((tick) => (
            <div
              key={tick.id}
              className="absolute"
              style={{ left: tick.x, top: AXIS_Y }}
            >
              <div
                className={
                  tick.isYear
                    ? "w-px bg-[var(--riso-ink)]/45"
                    : "w-px bg-[var(--riso-ink)]/18"
                }
                style={{
                  height: tick.isYear ? YEAR_TICK_HEIGHT : MONTH_TICK_HEIGHT,
                  transform: "translateY(-50%)",
                }}
              />
              {tick.label && (
                <span className="absolute top-8 -translate-x-1/2 font-mono text-xs font-bold text-[var(--riso-muted)]">
                  {tick.label}
                </span>
              )}
            </div>
          ))}

          {visibleEvents.map((event) => (
            <TimelineEventCard key={event.artwork_id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}
