"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { getCategoryColor } from "@/lib/timeline/colors";
import type { ProcessedEntry } from "@/lib/timeline/types";

interface Props {
  entry: ProcessedEntry;
  x: number;
  y: number;
  width: number;
  height: number;
  onHover: (entry: ProcessedEntry | null) => void;
  onHoverPosition: (pos: { x: number; y: number } | null) => void;
}

export const TimelineBar = memo(function TimelineBar({
  entry,
  x,
  y,
  width,
  height,
  onHover,
  onHoverPosition,
}: Props) {
  const color = getCategoryColor(entry.category);
  const router = useRouter();

  return (
    <div
      data-artwork-id={entry.artwork_id}
      style={{
        position: "absolute",
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width,
        height,
        backgroundColor: color.bg,
        willChange: "transform, width",
      }}
      className="group cursor-pointer rounded-sm"
      onClick={() => router.push(`/artworks/${entry.artwork_slug}`)}
      onMouseEnter={(e) => {
        onHover(entry);
        onHoverPosition({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => {
        onHoverPosition({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        onHover(null);
        onHoverPosition(null);
      }}
      tabIndex={0}
      role="link"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/artworks/${entry.artwork_slug}`);
        }
      }}
    >
      {/* Label — visibility toggled imperatively by Shell based on bar width */}
      <span
        data-bar-label
        className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate pointer-events-none"
        style={{
          color: color.text,
          display: width > 100 ? "flex" : "none",
        }}
      >
        {entry.artwork_title}
      </span>

      {/* Ongoing pulse */}
      {entry.is_ongoing && !entry.isCapped && (
        <span
          className="absolute right-0 top-0 bottom-0 w-1.5 animate-pulse rounded-r-sm"
          style={{ backgroundColor: color.border }}
        />
      )}

      {/* Capped duration fade */}
      {entry.isCapped && (
        <span
          className="absolute right-0 top-0 bottom-0 w-8 rounded-r-sm"
          style={{
            background: `linear-gradient(to right, transparent, ${color.bg}90)`,
            borderRight: `2px dashed ${color.border}`,
          }}
        />
      )}

      {/* Hover highlight */}
      <span className="absolute inset-0 rounded-sm bg-white/0 transition-colors group-hover:bg-white/20" />
    </div>
  );
}, (prev, next) => {
  // Only re-render if the entry identity or bar height changes.
  // x, y, width are updated imperatively by the Shell during zoom.
  return (
    prev.entry.artwork_id === next.entry.artwork_id &&
    prev.height === next.height
  );
});
