"use client";

import { TimelineBar } from "./TimelineBar";
import type { ProcessedEntry } from "@/lib/timeline/types";
import type { ScaleTime } from "d3-scale";

interface Props {
  entries: ProcessedEntry[];
  baseScale: ScaleTime<number, number>;
  barHeight: number;
  rowHeight: number;
  minBarWidth: number;
  onHover: (entry: ProcessedEntry | null) => void;
  onHoverPosition: (pos: { x: number; y: number } | null) => void;
}

export function TimelineBars({
  entries,
  baseScale,
  barHeight,
  rowHeight,
  minBarWidth,
  onHover,
  onHoverPosition,
}: Props) {
  return (
    <>
      {entries.map((entry) => {
        const x = baseScale(entry.startDate);
        const xEnd = baseScale(entry.endDate);
        const barWidth = Math.max(xEnd - x, minBarWidth);
        const y = entry.row * rowHeight;

        return (
          <TimelineBar
            key={entry.artwork_id}
            entry={entry}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            onHover={onHover}
            onHoverPosition={onHoverPosition}
          />
        );
      })}
    </>
  );
}
