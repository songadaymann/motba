"use client";

import { useEffect, useRef, useCallback } from "react";
import { axisTop } from "d3-axis";
import { select } from "d3-selection";
import { timeFormat } from "d3-time-format";
import { timeYear, timeMonth } from "d3-time";
import type { ScaleTime } from "d3-scale";
import { unwarpDate } from "@/lib/timeline/scales";

interface Props {
  baseScale: ScaleTime<number, number>;
  width: number;
  height: number;
  contentHeight: number;
  axisRedrawRef: React.MutableRefObject<((scale: ScaleTime<number, number>) => void) | null>;
}

export function TimelineAxis({ baseScale, width, height, contentHeight, axisRedrawRef }: Props) {
  const gRef = useRef<SVGGElement>(null);
  const gridRef = useRef<SVGGElement>(null);
  const lastDrawTime = useRef(0);

  const redrawAxis = useCallback((scale: ScaleTime<number, number>) => {
    if (!gRef.current || !gridRef.current) return;

    // Throttle to max ~12fps
    const now = performance.now();
    if (now - lastDrawTime.current < 80) return;
    lastDrawTime.current = now;

    const domain = scale.domain();
    const spanYears = domain[1].getFullYear() - domain[0].getFullYear();

    const tickInterval =
      spanYears > 80
        ? timeYear.every(10)
        : spanYears > 30
          ? timeYear.every(5)
          : spanYears > 10
            ? timeYear.every(2)
            : spanYears > 2
              ? timeYear.every(1)
              : timeMonth.every(3);

    const yearFmt = timeFormat("%Y");
    const monthYearFmt = timeFormat("%b %Y");
    const fullFmt = timeFormat("%b %d, %Y");

    const axis = axisTop(scale)
      .tickFormat((d) => {
        // Unwarp so labels show real years, not visual/compressed ones
        const real = unwarpDate(d as Date);
        if (spanYears > 2) return yearFmt(real);
        if (spanYears > 0.5) return monthYearFmt(real);
        return fullFmt(real);
      })
      .tickSizeOuter(0)
      .tickSizeInner(6);

    if (tickInterval) {
      axis.ticks(tickInterval);
    } else {
      axis.ticks(Math.max(Math.floor(width / 100), 3));
    }

    const g = select(gRef.current);
    g.call(axis);

    g.select(".domain").attr("stroke", "currentColor").attr("opacity", 0.2);
    g.selectAll(".tick line")
      .attr("stroke", "currentColor")
      .attr("opacity", 0.15);
    g.selectAll(".tick text")
      .attr("fill", "currentColor")
      .attr("opacity", 0.6)
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("font-family", "var(--font-geist-sans)");

    const grid = select(gridRef.current);
    grid.selectAll("*").remove();

    const ticks = tickInterval
      ? scale.ticks(tickInterval)
      : scale.ticks(Math.max(Math.floor(width / 100), 3));
    grid
      .selectAll("line")
      .data(ticks)
      .join("line")
      .attr("x1", (d) => scale(d))
      .attr("x2", (d) => scale(d))
      .attr("y1", 0)
      .attr("y2", contentHeight)
      .attr("stroke", "currentColor")
      .attr("opacity", 0.06)
      .attr("stroke-dasharray", "2,4");
  }, [width, contentHeight]);

  // Expose redraw function to Shell via ref
  useEffect(() => {
    axisRedrawRef.current = redrawAxis;
    return () => {
      axisRedrawRef.current = null;
    };
  }, [redrawAxis, axisRedrawRef]);

  // Initial draw
  useEffect(() => {
    redrawAxis(baseScale);
  }, [baseScale, redrawAxis]);

  return (
    <svg width={width} height={height} className="text-foreground overflow-visible">
      <g ref={gridRef} transform={`translate(0, ${height})`} />
      <g ref={gRef} transform={`translate(0, ${height - 4})`} />
    </svg>
  );
}
