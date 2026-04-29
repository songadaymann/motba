"use client";

import { motion } from "framer-motion";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { getCategoryColor, getCategoryLabel } from "@/lib/timeline/colors";
import type { ProcessedEntry } from "@/lib/timeline/types";

interface Props {
  entry: ProcessedEntry;
  position: { x: number; y: number };
}

export function TimelineTooltip({ entry, position }: Props) {
  const color = getCategoryColor(entry.category);
  const tooltipWidth = 280;

  // Position near cursor, flip if near right edge
  const left =
    position.x + tooltipWidth + 20 > window.innerWidth
      ? position.x - tooltipWidth - 12
      : position.x + 12;

  const top = Math.max(8, position.y - 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-popover p-3 shadow-lg"
      style={{ left, top, width: tooltipWidth }}
    >
      <div className="flex gap-3">
        {entry.artist_photo_cloudinary_id ? (
          <img
            src={cloudinaryUrl(entry.artist_photo_cloudinary_id, "artist-photo")}
            alt={entry.artist_name}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
            {entry.artist_name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate">
            {entry.artwork_title}
          </h4>
          <p className="text-xs text-muted-foreground">{entry.artist_name}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color.bg }}
        />
        <span className="text-xs text-muted-foreground">
          {getCategoryLabel(entry.category)}
        </span>
        <span className="text-xs text-muted-foreground">
          {entry.years_display ||
            `${entry.start_year || "?"} – ${entry.is_ongoing ? "ongoing" : entry.end_year || "?"}`}
        </span>
        {entry.isCapped && entry.actualEndYear && (
          <span className="text-xs text-muted-foreground italic">
            (ends {entry.actualEndYear})
          </span>
        )}
      </div>

      {entry.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {entry.description}
        </p>
      )}
    </motion.div>
  );
}
