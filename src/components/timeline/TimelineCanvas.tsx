"use client";

import { TimelineAxis } from "./TimelineAxis";
import { TimelineBars } from "./TimelineBars";
import type { ProcessedEntry } from "@/lib/timeline/types";
import type { TimelineConfig } from "@/lib/timeline/types";
import type { ScaleTime } from "d3-scale";

interface Props {
  entries: ProcessedEntry[];
  baseScale: ScaleTime<number, number>;
  config: TimelineConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
  barsContainerRef: React.RefObject<HTMLDivElement | null>;
  nowLineRef: React.RefObject<HTMLDivElement | null>;
  axisRedrawRef: React.RefObject<((scale: ScaleTime<number, number>) => void) | null>;
  width: number;
  height: number;
  onHover: (entry: ProcessedEntry | null) => void;
  onHoverPosition: (pos: { x: number; y: number } | null) => void;
}

export function TimelineCanvas({
  entries,
  baseScale,
  config,
  containerRef,
  barsContainerRef,
  nowLineRef,
  axisRedrawRef,
  width,
  height,
  onHover,
  onHoverPosition,
}: Props) {
  const totalRows = Math.max(...entries.map((e) => e.row), 0) + 1;
  const contentHeight = totalRows * config.rowHeight + 16;

  const nowX = baseScale(new Date());
  const showNow = nowX > 0 && nowX < width;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-y-auto"
      style={{ height, touchAction: "none" }}
    >
      {/* Axis - sticky at top with grid lines extending down */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <TimelineAxis
          baseScale={baseScale}
          width={width}
          height={config.axisHeight}
          contentHeight={contentHeight}
          axisRedrawRef={axisRedrawRef}
        />
      </div>

      {/* Bars container */}
      <div
        ref={barsContainerRef}
        className="relative"
        style={{ height: contentHeight, willChange: "transform" }}
      >
        <TimelineBars
          entries={entries}
          baseScale={baseScale}
          barHeight={config.barHeight}
          rowHeight={config.rowHeight}
          minBarWidth={config.minBarWidth}
          onHover={onHover}
          onHoverPosition={onHoverPosition}
        />

        {/* "Now" line — position updated imperatively by Shell */}
        <div
          ref={nowLineRef}
          className="absolute top-0 w-px border-l border-dashed border-foreground/25 pointer-events-none"
          style={{
            transform: `translate3d(${nowX}px, 0, 0)`,
            height: contentHeight,
            display: showNow ? "block" : "none",
          }}
        >
          <span className="absolute -top-1 -translate-x-1/2 rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Now
          </span>
        </div>
      </div>
    </div>
  );
}
