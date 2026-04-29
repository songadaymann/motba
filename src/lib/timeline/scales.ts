import { scaleTime, type ScaleTime } from "d3-scale";
import type { ZoomTransform } from "d3-zoom";
import type { TimelineEntry } from "@/types/database";
import type { ProcessedEntry } from "./types";

// Entries ending beyond this year get a "far future" visual indicator
export const FAR_FUTURE_YEAR = 2100;

// --- Date warping for far-future compression ---
// Before WARP_THRESHOLD: linear (1 real year = 1 visual year)
// After WARP_THRESHOLD: logarithmic compression
const WARP_THRESHOLD = new Date(2100, 0, 1).getTime();
// Controls how aggressively the far future compresses.
// Higher = more spread out. ~30 means 900 years (2100→3000) ≈ 80 visual years.
const WARP_COMPRESSION = 30;

/** Convert a real date to a "visual" date used for positioning. */
export function warpDate(date: Date): Date {
  const t = date.getTime();
  if (t <= WARP_THRESHOLD) return date;

  // Years past 2100
  const yearsPast = (t - WARP_THRESHOLD) / (365.25 * 24 * 60 * 60 * 1000);
  // log(1 + years) * compression → visual years past threshold
  const visualYearsPast = Math.log1p(yearsPast) * WARP_COMPRESSION;
  const visualTime =
    WARP_THRESHOLD + visualYearsPast * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(visualTime);
}

/** Convert a visual (warped) date back to a real date. Inverse of warpDate. */
export function unwarpDate(visualDate: Date): Date {
  const vt = visualDate.getTime();
  if (vt <= WARP_THRESHOLD) return visualDate;

  const visualYearsPast =
    (vt - WARP_THRESHOLD) / (365.25 * 24 * 60 * 60 * 1000);
  // Inverse of log1p: expm1
  const realYearsPast = Math.expm1(visualYearsPast / WARP_COMPRESSION);
  const realTime =
    WARP_THRESHOLD + realYearsPast * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(realTime);
}

export function processEntries(entries: TimelineEntry[]): ProcessedEntry[] {
  return entries.map((entry) => {
    const startDate = new Date(entry.computed_start_date);
    const endDate = new Date(entry.computed_end_date);
    const isCapped = endDate.getFullYear() > FAR_FUTURE_YEAR;

    return {
      ...entry,
      startDate: warpDate(startDate),
      endDate: warpDate(endDate),
      actualEndYear: entry.end_year,
      isCapped,
      row: 0,
    };
  });
}

export function createTimeScale(
  entries: ProcessedEntry[],
  width: number
): ScaleTime<number, number> {
  const times = entries.flatMap((e) => [
    e.startDate.getTime(),
    e.endDate.getTime(),
  ]);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const padding = (maxTime - minTime) * 0.02;

  return scaleTime()
    .domain([new Date(minTime - padding), new Date(maxTime + padding)])
    .range([0, width]);
}

export function getZoomedScale(
  baseScale: ScaleTime<number, number>,
  transform: ZoomTransform
): ScaleTime<number, number> {
  return transform.rescaleX(baseScale);
}
