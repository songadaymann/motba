"use client";

import { useState, useEffect } from "react";

/**
 * Animated SVG hourglass made of halftone dots.
 * Sand drains from top to bottom over the course of an hour,
 * then flips 180° and starts again.
 */

const TOTAL_ROWS = 24;
const TOTAL_COLS = 20;
const SVG_W = 100;
const SVG_H = 80;

// Deterministic pseudo-random
const seed = (n: number) => ((n * 9301 + 49297) % 233280) / 233280;

interface Dot {
  x: number;
  y: number;
  r: number;
  /** Normalized position within the top or bottom half (0–1). Used for drain ordering. */
  drainOrder: number;
  /** 'top' or 'bottom' half of the hourglass */
  half: "top" | "bottom";
}

/** Compute all possible dot positions for the hourglass shape. */
function computeAllDots(): Dot[] {
  const dots: Dot[] = [];
  let i = 0;

  for (let row = 0; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      const x = col * 5 + 2.5;
      const y = row * 3.5 + 2;
      const centerX = SVG_W / 2;
      const distFromCenter = Math.abs(x - centerX);

      const normalizedY = y / (SVG_H - 2);
      let maxDist: number;
      if (normalizedY < 0.45) {
        maxDist = 45 - normalizedY * 80;
      } else if (normalizedY < 0.55) {
        maxDist = 6;
      } else {
        maxDist = 45 - (1 - normalizedY) * 80;
      }

      if (distFromCenter > maxDist) {
        i += 2; // keep seed in sync
        continue;
      }

      // Use density to thin out dots (like original)
      const density = normalizedY > 0.55 ? 0.85 : normalizedY < 0.3 ? 0.3 : 0.5;
      if (seed(i++) > density) {
        i++;
        continue;
      }

      const r = 1 + seed(i++) * 1;
      const half = normalizedY < 0.5 ? "top" : "bottom";

      // Drain order: for top dots, those closest to the neck (center-bottom) drain first.
      // For bottom dots, those closest to the neck fill first (appear first).
      let drainOrder: number;
      if (half === "top") {
        // Higher normalizedY + closer to center = drains first (lower number)
        drainOrder = 1 - (normalizedY / 0.5) + (distFromCenter / 50) * 0.3;
      } else {
        // Lower normalizedY (near neck) + closer to center = fills first (lower number)
        drainOrder = ((normalizedY - 0.5) / 0.5) + (distFromCenter / 50) * 0.3;
        // Invert so bottom fills from neck outward/downward
        drainOrder = 1 - drainOrder;
      }

      dots.push({ x, y, r, drainOrder, half });
    }
  }

  return dots;
}

const ALL_DOTS = computeAllDots();
const TOP_DOTS = ALL_DOTS.filter((d) => d.half === "top").sort(
  (a, b) => a.drainOrder - b.drainOrder
);
const BOTTOM_DOTS = ALL_DOTS.filter((d) => d.half === "bottom").sort(
  (a, b) => a.drainOrder - b.drainOrder
);

/**
 * Given a progress 0–1, return the dots to render.
 * progress=0: top full, bottom empty
 * progress=1: top empty, bottom full
 */
function getDotsForProgress(progress: number): Dot[] {
  const topVisible = Math.round(TOP_DOTS.length * (1 - progress));
  const bottomVisible = Math.round(BOTTOM_DOTS.length * progress);

  // Top: keep the first N (farthest from neck)
  const top = TOP_DOTS.slice(0, topVisible);
  // Bottom: show the first N (closest to neck, filling up)
  const bottom = BOTTOM_DOTS.slice(0, bottomVisible);

  return [...top, ...bottom];
}

function getHourProgress() {
  const now = new Date();
  return (now.getMinutes() * 60 + now.getSeconds()) / 3600;
}

export function DitheredHourglass() {
  const [progress, setProgress] = useState(() => getHourProgress());
  const [flipCount, setFlipCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const p = getHourProgress();
      setProgress(p);

      // Check if we crossed the hour boundary (progress reset near 0)
      if (p < 0.01) {
        setFlipCount((c) => c + 1);
      }
    }, 2000); // Update every 2 seconds for smooth-enough animation

    return () => clearInterval(interval);
  }, []);

  const dots = getDotsForProgress(progress);
  // Flip 180° on odd hours
  const rotation = flipCount % 2 === 1 ? 180 : 0;

  return (
    <div className="flex justify-center py-2 mb-5">
      <svg
        width={100}
        height={80}
        viewBox="0 0 100 80"
        className="opacity-50"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.8s ease-in-out",
        }}
        aria-hidden="true"
      >
        {dots.map((dot) => (
          <circle
            key={`${dot.x}-${dot.y}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill="currentColor"
          >
            <animate
              attributeName="opacity"
              from="0"
              to="1"
              dur="0.4s"
              fill="freeze"
            />
          </circle>
        ))}
        <line x1="5" y1="2" x2="95" y2="2" stroke="currentColor" strokeWidth="2.5" />
        <line x1="5" y1="78" x2="95" y2="78" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
