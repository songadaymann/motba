import type { TimelineEntry } from "@/types/database";

export interface ProcessedEntry extends TimelineEntry {
  startDate: Date;
  endDate: Date;
  actualEndYear: number | null;
  isCapped: boolean;
  row: number;
}

export type DetailLevel = "overview" | "standard" | "detail";

export function computeDetailLevel(k: number): DetailLevel {
  if (k < 3) return "overview";
  if (k >= 15) return "detail";
  return "standard";
}

export interface TimelineConfig {
  barHeight: number;
  barGap: number;
  rowHeight: number;
  axisHeight: number;
  minimapHeight: number;
  minBarWidth: number;
}
