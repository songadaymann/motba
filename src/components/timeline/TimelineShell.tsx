"use client";

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { TimelineEntry } from "@/types/database";
import type { ArtCategory } from "@/lib/constants";
import type { ProcessedEntry, TimelineConfig } from "@/lib/timeline/types";
import type { ScaleTime } from "d3-scale";
import type { ZoomTransform } from "d3-zoom";
import {
  processEntries,
  createTimeScale,
} from "@/lib/timeline/scales";
import { assignRows, filterByCategories } from "@/lib/timeline/utils";
import {
  useTimelineZoom,
  useTimelineDimensions,
} from "@/lib/timeline/hooks";
import { TimelineControls } from "./TimelineControls";
import { TimelineCanvas } from "./TimelineCanvas";
import { TimelineMinimap } from "./TimelineMinimap";
import { TimelineTooltip } from "./TimelineTooltip";

const BASE_CONFIG: TimelineConfig = {
  barHeight: 32,
  barGap: 6,
  rowHeight: 38,
  axisHeight: 48,
  minimapHeight: 52,
  minBarWidth: 4,
};

// Row scale presets: [barHeight, rowHeight]
const ROW_SCALES: [number, number][] = [
  [12, 16],  // very compact
  [20, 26],  // compact
  [32, 38],  // default
  [44, 52],  // expanded
  [60, 70],  // very expanded
];
const DEFAULT_ROW_SCALE_INDEX = 2;

export function TimelineShell({ entries, fullscreen = false }: { entries: TimelineEntry[]; fullscreen?: boolean }) {
  const [activeCategories, setActiveCategories] = useState<Set<ArtCategory>>(
    new Set()
  );
  const [hoveredEntry, setHoveredEntry] = useState<ProcessedEntry | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [rowScaleIndex, setRowScaleIndex] = useState(DEFAULT_ROW_SCALE_INDEX);

  const config = useMemo<TimelineConfig>(() => ({
    ...BASE_CONFIG,
    barHeight: ROW_SCALES[rowScaleIndex][0],
    rowHeight: ROW_SCALES[rowScaleIndex][1],
  }), [rowScaleIndex]);

  const configRef = useRef(config);

  const { ref: sizeRef, width, height } = useTimelineDimensions();

  // Refs for imperative DOM updates
  const barsContainerRef = useRef<HTMLDivElement>(null);
  const minimapViewportRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const axisRedrawRef = useRef<((scale: ScaleTime<number, number>) => void) | null>(null);

  const allProcessed = useMemo(
    () => assignRows(processEntries(entries)),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const filtered = filterByCategories(allProcessed, activeCategories);
    return assignRows(filtered);
  }, [allProcessed, activeCategories]);

  // Keep a ref to filteredEntries for the imperative callback
  const filteredEntriesRef = useRef(filteredEntries);

  const baseScale = useMemo(
    () => (width > 0 ? createTimeScale(allProcessed, width) : null),
    [allProcessed, width]
  );

  const initialFocusRange = useMemo<[Date, Date]>(() => {
    const focusStart = new Date(1900, 0, 1);
    const focusEnd = new Date(new Date().getFullYear() + 10, 0, 1);
    return [focusStart, focusEnd];
  }, []);

  const canvasHeight =
    height - config.axisHeight - config.minimapHeight - 44;
  const {
    containerRef: zoomRef,
    transformRef,
    detailLevel,
    onTransformFrameRef,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useTimelineZoom({
    scaleExtent: [0.1, 80],
    width,
    height: Math.max(canvasHeight, 100),
    initialFocusRange,
    baseScale,
  });

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    filteredEntriesRef.current = filteredEntries;
  }, [filteredEntries]);

  // The imperative per-frame callback — runs at 60fps during zoom/pan
  // Updates DOM directly without triggering React re-renders
  useEffect(() => {
    if (!baseScale) return;

    onTransformFrameRef.current = (t: ZoomTransform) => {
      const scale = t.rescaleX(baseScale);
      const currentEntries = filteredEntriesRef.current;
      const cfg = configRef.current;

      // Update bar positions via direct DOM manipulation
      if (barsContainerRef.current) {
        const children = barsContainerRef.current.children;
        for (let i = 0; i < currentEntries.length; i++) {
          const entry = currentEntries[i];
          const el = children[i] as HTMLElement | undefined;
          if (!el) continue;

          const x = scale(entry.startDate);
          const xEnd = scale(entry.endDate);
          const barWidth = Math.max(xEnd - x, cfg.minBarWidth);
          const y = entry.row * cfg.rowHeight;

          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          el.style.width = `${barWidth}px`;

          // Toggle label visibility
          const label = el.querySelector("[data-bar-label]") as HTMLElement | null;
          if (label) {
            label.style.display = barWidth > 100 ? "flex" : "none";
          }
        }
      }

      // Update minimap viewport indicator
      if (minimapViewportRef.current) {
        const left = Math.max(0, -t.x / t.k);
        const w = Math.min(width, width / t.k);
        minimapViewportRef.current.style.left = `${left}px`;
        minimapViewportRef.current.style.width = `${Math.max(w, 20)}px`;
      }

      // Update "now" line
      if (nowLineRef.current) {
        const nowX = scale(new Date());
        const visible = nowX > 0 && nowX < width;
        nowLineRef.current.style.transform = `translate3d(${nowX}px, 0, 0)`;
        nowLineRef.current.style.display = visible ? "block" : "none";
      }

      // Throttled axis redraw (handled internally by the axis component)
      axisRedrawRef.current?.(scale);
    };

    return () => {
      onTransformFrameRef.current = null;
    };
  }, [baseScale, width, onTransformFrameRef]);

  // Re-sync imperative positions after React re-renders (filter changes, detail level changes, row scale changes)
  useLayoutEffect(() => {
    if (!baseScale) return;
    const t = transformRef.current;
    onTransformFrameRef.current?.(t);
  }, [filteredEntries, detailLevel, baseScale, transformRef, onTransformFrameRef, config]);

  const expandRows = useCallback(() => {
    setRowScaleIndex((i) => Math.min(i + 1, ROW_SCALES.length - 1));
  }, []);

  const contractRows = useCallback(() => {
    setRowScaleIndex((i) => Math.max(i - 1, 0));
  }, []);

  const toggleCategory = (cat: ArtCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (!width || !baseScale) {
    return (
      <div
        ref={sizeRef}
        className={`${fullscreen ? "h-svh" : "h-[calc(100svh-4rem)]"} w-full flex items-center justify-center text-muted-foreground`}
      >
        Loading timeline...
      </div>
    );
  }

  return (
    <div ref={sizeRef} className={`relative ${fullscreen ? "h-svh" : "h-[calc(100svh-4rem)]"} w-full flex flex-col`}>
      <TimelineControls
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        onExpandRows={expandRows}
        onContractRows={contractRows}
        entryCount={filteredEntries.length}
        totalCount={allProcessed.length}
      />

      <TimelineCanvas
        entries={filteredEntries}
        baseScale={baseScale}
        config={config}
        containerRef={zoomRef}
        barsContainerRef={barsContainerRef}
        nowLineRef={nowLineRef}
        axisRedrawRef={axisRedrawRef}
        width={width}
        height={Math.max(canvasHeight, 100)}
        onHover={setHoveredEntry}
        onHoverPosition={setHoverPos}
      />

      <TimelineMinimap
        entries={allProcessed}
        baseScale={baseScale}
        transformRef={transformRef}
        width={width}
        height={config.minimapHeight}
        activeCategories={activeCategories}
        viewportRef={minimapViewportRef}
      />

      <AnimatePresence>
        {hoveredEntry && hoverPos && (
          <TimelineTooltip entry={hoveredEntry} position={hoverPos} />
        )}
      </AnimatePresence>
    </div>
  );
}
