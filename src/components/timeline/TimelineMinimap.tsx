"use client";

import { useMemo, useRef, useEffect } from "react";
import { getCategoryBg } from "@/lib/timeline/colors";
import { assignRows } from "@/lib/timeline/utils";
import type { ProcessedEntry } from "@/lib/timeline/types";
import type { ZoomTransform } from "d3-zoom";
import type { ScaleTime } from "d3-scale";
import type { ArtCategory } from "@/lib/constants";

interface Props {
  entries: ProcessedEntry[];
  baseScale: ScaleTime<number, number>;
  transformRef: React.RefObject<ZoomTransform>;
  width: number;
  height: number;
  activeCategories: Set<ArtCategory>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

export function TimelineMinimap({
  entries,
  baseScale,
  transformRef,
  width,
  height,
  activeCategories,
  viewportRef,
}: Props) {
  const displayEntries = useMemo(() => {
    const filtered =
      activeCategories.size > 0
        ? entries.filter((e) => activeCategories.has(e.category))
        : entries;
    return assignRows(filtered);
  }, [entries, activeCategories]);

  const maxRow = Math.max(...displayEntries.map((e) => e.row), 0);
  const lineHeight = Math.max(2, Math.min(4, (height - 16) / (maxRow + 1)));

  // Set initial viewport position
  useEffect(() => {
    if (!viewportRef.current) return;
    const t = transformRef.current;
    const left = Math.max(0, -t.x / t.k);
    const w = Math.min(width, width / t.k);
    viewportRef.current.style.left = `${left}px`;
    viewportRef.current.style.width = `${Math.max(w, 20)}px`;
  }, [transformRef, width, viewportRef]);

  return (
    <div
      className="relative border-t border-border bg-muted/30"
      style={{ height }}
    >
      {displayEntries.map((entry) => {
        const x = baseScale(entry.startDate);
        const w = Math.max(baseScale(entry.endDate) - x, 1);
        return (
          <div
            key={entry.artwork_id}
            className="absolute rounded-full"
            style={{
              left: x,
              top: 8 + entry.row * (lineHeight + 1),
              width: w,
              height: lineHeight,
              backgroundColor: getCategoryBg(entry.category),
              opacity: 0.6,
            }}
          />
        );
      })}

      {/* Viewport indicator — position updated imperatively by Shell */}
      <div
        ref={viewportRef}
        className="absolute top-0 bottom-0 border border-foreground/20 bg-foreground/5 rounded-sm"
        style={{ left: 0, width: 20 }}
      />
    </div>
  );
}
