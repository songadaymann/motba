"use client";

import { CATEGORIES, CATEGORY_COLORS, type ArtCategory } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  activeCategories: Set<ArtCategory>;
  onToggleCategory: (cat: ArtCategory) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onExpandRows: () => void;
  onContractRows: () => void;
  entryCount: number;
  totalCount: number;
}

export function TimelineControls({
  activeCategories,
  onToggleCategory,
  onZoomIn,
  onZoomOut,
  onReset,
  onExpandRows,
  onContractRows,
  entryCount,
  totalCount,
}: Props) {
  const allActive = activeCategories.size === 0;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur">
      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <Badge
          variant={allActive ? "default" : "outline"}
          className="cursor-pointer shrink-0 text-xs"
          onClick={() => {
            // Clear all filters
            CATEGORIES.forEach((cat) => {
              if (activeCategories.has(cat)) onToggleCategory(cat);
            });
          }}
        >
          All ({totalCount})
        </Badge>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategories.has(cat);
          return (
            <Badge
              key={cat}
              variant={isActive ? "default" : "outline"}
              className="cursor-pointer shrink-0 text-xs"
              style={
                isActive
                  ? {
                      backgroundColor: CATEGORY_COLORS[cat].bg,
                      color: CATEGORY_COLORS[cat].text,
                    }
                  : undefined
              }
              onClick={() => onToggleCategory(cat)}
            >
              {CATEGORY_COLORS[cat].label}
            </Badge>
          );
        })}
        {!allActive && (
          <span className="text-xs text-muted-foreground shrink-0 ml-1">
            {entryCount} of {totalCount}
          </span>
        )}
      </div>

      {/* Zoom & row controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Vertical expand/contract */}
        <Button variant="ghost" size="sm" onClick={onContractRows} title="Contract rows vertically">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15M12 7.5l-3 3m3-3l3 3M12 16.5l-3-3m3 3l3-3" />
          </svg>
        </Button>
        <Button variant="ghost" size="sm" onClick={onExpandRows} title="Expand rows vertically">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15M12 4.5l-3 3m3-3l3 3M12 19.5l-3-3m3 3l3-3" />
          </svg>
        </Button>

        <span className="w-px h-4 bg-border mx-1" />

        {/* Horizontal zoom */}
        <Button variant="ghost" size="sm" onClick={onZoomOut} title="Zoom out (horizontal)">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
          </svg>
        </Button>
        <Button variant="ghost" size="sm" onClick={onZoomIn} title="Zoom in (horizontal)">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset} title="Reset zoom">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
