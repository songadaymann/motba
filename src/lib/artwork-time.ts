import type { ProjectFrequency } from "@/types/database";

export const FAR_FUTURE_DURATION_BY_SLUG: Record<
  string,
  { yearsDisplay: string; daysDisplay: string }
> = {
  "0xdesigner-310-px0-2-18-5-18-p-k-k-k": {
    yearsDisplay: "3.343 × 10^48 years",
    daysDisplay: "1.221 × 10^51",
  },
};

export function getFarFutureDuration(slug: string) {
  return FAR_FUTURE_DURATION_BY_SLUG[slug] ?? null;
}

export function isFarFutureWork(slug: string, yearsDisplay?: string | null) {
  return Boolean(
    getFarFutureDuration(slug) ||
      yearsDisplay?.includes("10^48") ||
      yearsDisplay?.includes("10^{48}")
  );
}

export type ArtworkTimeFields = {
  slug?: string | null;
  years_display?: string | null;
  start_year?: number | null;
  start_month?: number | null;
  start_day?: number | null;
  end_year?: number | null;
  end_month?: number | null;
  end_day?: number | null;
  is_ongoing?: boolean | number | string | null;
  project_frequency?: ProjectFrequency | string | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function isOngoing(artwork: ArtworkTimeFields): boolean {
  return (
    artwork.is_ongoing === true ||
    artwork.is_ongoing === 1 ||
    artwork.is_ongoing === "1"
  );
}

function getProjectFrequency(artwork: ArtworkTimeFields): ProjectFrequency {
  return artwork.project_frequency === "yearly" ? "yearly" : "daily";
}

function getYearlyEntryCount(
  artwork: ArtworkTimeFields,
  now: Date
): number | null {
  if (!artwork.start_year) return null;

  const endYear = artwork.end_year ?? (isOngoing(artwork) ? now.getFullYear() : null);
  if (!endYear) return null;

  const count = endYear - artwork.start_year + 1;
  return count > 0 ? count : null;
}

export function getArtworkCountMetric(
  artwork: ArtworkTimeFields,
  now = new Date()
): { value: string; label: "DAYS" | "YEARS"; isOngoing: boolean } | null {
  const farFutureDuration = artwork.slug
    ? getFarFutureDuration(artwork.slug)
    : null;
  if (farFutureDuration) {
    return {
      value: farFutureDuration.daysDisplay,
      label: "DAYS",
      isOngoing: false,
    };
  }

  const ongoing = isOngoing(artwork) && !artwork.end_year;

  if (getProjectFrequency(artwork) === "yearly") {
    const count = getYearlyEntryCount(artwork, now);
    if (count == null) return null;
    return {
      value: count.toLocaleString(),
      label: "YEARS",
      isOngoing: ongoing,
    };
  }

  const durationMs = getDurationMs(artwork, now);
  if (durationMs == null) return null;

  return {
    value: Math.floor(durationMs / DAY_MS).toLocaleString(),
    label: "DAYS",
    isOngoing: ongoing,
  };
}

function hasOngoingWord(value: string): boolean {
  return /\b(now|ongoing|present)\b/i.test(value);
}

function removeOngoingTail(value: string): string | null {
  const cleaned = value
    .replace(/\s*(?:-|–|—|to)\s*(?:now|ongoing|present)\s*$/i, "")
    .replace(/\s*\((?:now|ongoing|present)\)\s*$/i, "")
    .trim();

  return cleaned || null;
}

function getStructuredYearsDisplay(
  artwork: ArtworkTimeFields,
  ongoing: boolean
): string | null {
  const start = artwork.start_year ? String(artwork.start_year) : null;

  if (ongoing) {
    return start ? `${start} - now` : "now";
  }

  const end = artwork.end_year ? String(artwork.end_year) : null;
  if (start && end) return `${start} - ${end}`;
  return start ?? (end ? `? - ${end}` : null);
}

export function getArtworkYearsDisplay(
  artwork: ArtworkTimeFields
): string | null {
  const storedDisplay = artwork.years_display?.trim() || null;
  const farFutureDuration = artwork.slug
    ? getFarFutureDuration(artwork.slug)
    : null;

  if (farFutureDuration) {
    if (
      storedDisplay?.includes("10^48") ||
      storedDisplay?.includes("10^{48}")
    ) {
      return storedDisplay;
    }

    return artwork.start_year
      ? `${artwork.start_year} - ${farFutureDuration.yearsDisplay}`
      : farFutureDuration.yearsDisplay;
  }

  const ongoing = isOngoing(artwork);
  const structuredDisplay = getStructuredYearsDisplay(artwork, ongoing);

  if (storedDisplay && (!hasOngoingWord(storedDisplay) || ongoing)) {
    return storedDisplay;
  }

  if (storedDisplay) {
    return structuredDisplay ?? removeOngoingTail(storedDisplay);
  }

  return structuredDisplay;
}

function getEndDate(artwork: ArtworkTimeFields, now: Date): Date | null {
  if (!artwork.end_year) {
    return isOngoing(artwork) ? now : null;
  }

  if (artwork.end_month && artwork.end_day) {
    return new Date(
      artwork.end_year,
      artwork.end_month - 1,
      artwork.end_day
    );
  }

  return new Date(artwork.end_year, 11, 31);
}

function getDurationMs(artwork: ArtworkTimeFields, now: Date): number | null {
  if (!artwork.start_year || !artwork.start_month || !artwork.start_day) {
    return null;
  }

  const start = new Date(
    artwork.start_year,
    artwork.start_month - 1,
    artwork.start_day
  );
  const end = getEndDate(artwork, now);
  if (!end) return null;

  const diffMs = end.getTime() - start.getTime();
  return diffMs >= 0 ? diffMs : null;
}

export function getArtworkDurationText(
  artwork: ArtworkTimeFields,
  now = new Date()
): string | null {
  const farFutureDuration = artwork.slug
    ? getFarFutureDuration(artwork.slug)
    : null;
  if (farFutureDuration) {
    return `${farFutureDuration.daysDisplay} days (${farFutureDuration.yearsDisplay})`;
  }

  if (getProjectFrequency(artwork) === "yearly") {
    const count = getYearlyEntryCount(artwork, now);
    if (count == null) return null;

    const label = count === 1 ? "yearly entry" : "yearly entries";
    return isOngoing(artwork) && !artwork.end_year
      ? `${count.toLocaleString()} ${label} and counting`
      : `${count.toLocaleString()} ${label}`;
  }

  if (!artwork.start_year || !artwork.start_month || !artwork.start_day) {
    return null;
  }

  const durationMs = getDurationMs(artwork, now);
  if (durationMs == null) return null;

  const days = Math.floor(durationMs / DAY_MS);
  const years =
    artwork.end_year &&
    artwork.start_month === 1 &&
    artwork.start_day === 1 &&
    artwork.end_month === 1 &&
    artwork.end_day === 1
      ? artwork.end_year - artwork.start_year
      : Math.floor(days / 365.25);
  const formattedDays = days.toLocaleString();

  if (isOngoing(artwork) && !artwork.end_year) {
    if (years >= 2) {
      return `${formattedDays} days and counting (${years} years)`;
    }
    return `${formattedDays} days and counting`;
  }

  if (years >= 2) {
    return `${formattedDays} days (${years} years)`;
  }
  return `${formattedDays} days`;
}
