import type { ProcessedEntry } from "./types";
import type { ArtCategory } from "@/lib/constants";

export function assignRows(entries: ProcessedEntry[]): ProcessedEntry[] {
  const sorted = [...entries].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  const rowEnds: number[] = [];

  return sorted.map((entry) => {
    const startTime = entry.startDate.getTime();
    let row = rowEnds.findIndex((endTime) => endTime <= startTime);

    if (row === -1) {
      row = rowEnds.length;
    }

    rowEnds[row] = entry.endDate.getTime();
    return { ...entry, row };
  });
}

export function filterByCategories(
  entries: ProcessedEntry[],
  activeCategories: Set<ArtCategory>
): ProcessedEntry[] {
  if (activeCategories.size === 0) return entries;
  return entries.filter((e) => activeCategories.has(e.category));
}
