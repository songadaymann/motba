"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { zoom as d3Zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import "d3-transition";
import type { ScaleTime } from "d3-scale";
import { computeDetailLevel, type DetailLevel } from "./types";
import { VelocityTracker, MomentumAnimator } from "./momentum";

export function useTimelineZoom(options: {
  scaleExtent: [number, number];
  width: number;
  height: number;
  initialFocusRange?: [Date, Date];
  baseScale: ScaleTime<number, number> | null;
}) {
  const { scaleExtent, width, height, initialFocusRange, baseScale } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ReturnType<typeof d3Zoom<HTMLDivElement, unknown>>>(null);
  const initializedRef = useRef(false);

  // Only triggers React re-render when zoom crosses a detail threshold
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("standard");
  const detailLevelRef = useRef<DetailLevel>("standard");

  // Callback for imperative per-frame DOM updates (set by Shell)
  const onTransformFrameRef = useRef<((t: ZoomTransform) => void) | null>(null);

  // Momentum
  const velocityTracker = useRef(new VelocityTracker());
  const momentumAnimator = useRef<MomentumAnimator | null>(null);
  const isMomentumActive = useRef(false);

  useEffect(() => {
    if (!containerRef.current || width === 0) return;

    // Clamp left edge so user can't scroll before 1900
    const leftBound = baseScale
      ? baseScale(new Date(1900, 0, 1))
      : 0;

    const zoomBehavior = d3Zoom<HTMLDivElement, unknown>()
      .scaleExtent(scaleExtent)
      .translateExtent([
        [leftBound, -Infinity],
        [Infinity, Infinity],
      ])
      .wheelDelta((event) => -event.deltaY * 0.008)
      .filter((event) => {
        // Block double-click zoom
        if (event.type === "dblclick") return false;
        // Wheel events: only zoom when Ctrl/Cmd is held (pinch-zoom on trackpad
        // sends ctrlKey=true automatically). Horizontal swipe is handled separately.
        if (event.type === "wheel") {
          return event.ctrlKey || event.metaKey;
        }
        return true;
      })
      .on("start", () => {
        // Kill any in-flight momentum when user starts interacting
        if (momentumAnimator.current?.isActive) {
          momentumAnimator.current.stop();
        }
        isMomentumActive.current = false;
        velocityTracker.current.reset();
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;

        // Track velocity for momentum (only from user gestures, not momentum itself)
        if (!isMomentumActive.current && event.sourceEvent) {
          velocityTracker.current.sample(event.transform.x);
        }

        // Imperative DOM updates — no React re-render
        onTransformFrameRef.current?.(event.transform);

        // Only trigger React re-render when detail level changes
        const newLevel = computeDetailLevel(event.transform.k);
        if (newLevel !== detailLevelRef.current) {
          detailLevelRef.current = newLevel;
          setDetailLevel(newLevel);
        }
      })
      .on("end", () => {
        // Don't start momentum from momentum's own end event
        if (isMomentumActive.current) {
          isMomentumActive.current = false;
          return;
        }

        const velocity = velocityTracker.current.getVelocity();
        if (Math.abs(velocity) > 50) {
          isMomentumActive.current = true;
          momentumAnimator.current = new MomentumAnimator({
            velocity,
            timeConstant: 325,
            onUpdate: (deltaX) => {
              if (!containerRef.current || !zoomRef.current) return;
              const sel = select(containerRef.current);
              zoomRef.current.translateBy(sel, deltaX, 0);
            },
            onComplete: () => {
              isMomentumActive.current = false;
            },
          });
          momentumAnimator.current.start();
        }
      });

    zoomRef.current = zoomBehavior;
    const sel = select(containerRef.current);
    sel.call(zoomBehavior);

    // Horizontal trackpad swipe → pan (bypasses d3-zoom's wheel-as-zoom)
    const el = containerRef.current;
    const handleWheel = (event: WheelEvent) => {
      // Let pinch-zoom through to d3-zoom (ctrlKey is set by trackpad pinch)
      if (event.ctrlKey || event.metaKey) return;
      // Only handle predominantly horizontal swipes
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 1) {
        event.preventDefault();
        const k = transformRef.current.k;
        // deltaX is in screen px; translate in zoom-space (divide by scale)
        zoomBehavior.translateBy(sel, -event.deltaX / k, 0);
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });

    // Set initial zoom to focus range on first mount
    if (
      !initializedRef.current &&
      initialFocusRange &&
      baseScale
    ) {
      initializedRef.current = true;
      const [focusStart, focusEnd] = initialFocusRange;
      const x0 = baseScale(focusStart);
      const x1 = baseScale(focusEnd);
      const pad = 30;
      const k = width / (x1 - x0 + pad * 2);
      const tx = -x0 * k + pad;
      const initialTransform = zoomIdentity.translate(tx, 0).scale(k);

      sel.call(zoomBehavior.transform, initialTransform);
    }

    return () => {
      if (momentumAnimator.current?.isActive) {
        momentumAnimator.current.stop();
      }
      el.removeEventListener("wheel", handleWheel);
      select(el).on(".zoom", null);
    };
  }, [width, height, scaleExtent, baseScale, initialFocusRange]);

  const zoomIn = useCallback(() => {
    if (!containerRef.current || !zoomRef.current) return;
    if (momentumAnimator.current?.isActive) momentumAnimator.current.stop();
    const sel = select(containerRef.current);
    sel.transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
  }, []);

  const zoomOut = useCallback(() => {
    if (!containerRef.current || !zoomRef.current) return;
    if (momentumAnimator.current?.isActive) momentumAnimator.current.stop();
    const sel = select(containerRef.current);
    sel.transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.5);
  }, []);

  const resetZoom = useCallback(() => {
    if (!containerRef.current || !zoomRef.current || !baseScale || !initialFocusRange) return;
    if (momentumAnimator.current?.isActive) momentumAnimator.current.stop();
    const [focusStart, focusEnd] = initialFocusRange;
    const x0 = baseScale(focusStart);
    const x1 = baseScale(focusEnd);
    const pad = 30;
    const k = width / (x1 - x0 + pad * 2);
    const tx = -x0 * k + pad;
    const t = zoomIdentity.translate(tx, 0).scale(k);

    const sel = select(containerRef.current);
    sel.transition().duration(500).call(zoomRef.current.transform, t);
  }, [baseScale, initialFocusRange, width]);

  const zoomToRange = useCallback(
    (startDate: Date, endDate: Date, baseScale: ScaleTime<number, number>) => {
      if (!containerRef.current || !zoomRef.current) return;
      if (momentumAnimator.current?.isActive) momentumAnimator.current.stop();
      const x0 = baseScale(startDate);
      const x1 = baseScale(endDate);
      const pad = 40;
      const k = width / (x1 - x0 + pad * 2);
      const tx = -x0 * k + pad;

      const sel = select(containerRef.current);
      sel
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, zoomIdentity.translate(tx, 0).scale(k));
    },
    [width]
  );

  return {
    containerRef,
    transformRef,
    detailLevel,
    onTransformFrameRef,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToRange,
  };
}

export function useTimelineDimensions() {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });

    observer.observe(element);
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, []);

  return { ref, ...dimensions };
}
