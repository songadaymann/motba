"use client";

import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type OpenSeadragon from "openseadragon";
import { Button } from "@/components/ui/button";

type DeepZoomGalleryViewerProps = {
  title: string;
  description?: string | null;
  tileSourceUrl: string;
  previewUrl?: string | null;
  imageCount: number;
  width: number;
  height: number;
};

export function DeepZoomGalleryViewer({
  title,
  description,
  tileSourceUrl,
  previewUrl,
  imageCount,
  width,
  height,
}: DeepZoomGalleryViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPreview, setShowPreview] = useState(Boolean(previewUrl));

  useEffect(() => {
    let cancelled = false;
    let viewer: OpenSeadragon.Viewer | null = null;

    if (!tileSourceUrl) {
      setError("Deep zoom tiles are not configured.");
      return;
    }

    setError(null);
    setIsReady(false);
    setShowPreview(Boolean(previewUrl));

    import("openseadragon")
      .then((module) => {
        if (cancelled || !containerRef.current) return;

        const createViewer = module.default;
        viewer = createViewer({
          element: containerRef.current,
          tileSources: tileSourceUrl,
          drawer: "canvas",
          crossOriginPolicy: "Anonymous",
          showNavigator: true,
          showNavigationControl: false,
          navigatorPosition: "BOTTOM_RIGHT",
          navigatorSizeRatio: 0.16,
          animationTime: 0.8,
          blendTime: 0.1,
          constrainDuringPan: true,
          visibilityRatio: 0.2,
          minZoomImageRatio: 0.65,
          maxZoomPixelRatio: 2,
          gestureSettingsMouse: {
            clickToZoom: true,
            dblClickToZoom: true,
            dragToPan: true,
            scrollToZoom: true,
          },
          gestureSettingsTouch: {
            clickToZoom: true,
            dblClickToZoom: true,
            dragToPan: true,
            pinchToZoom: true,
          },
        });
        viewer.addOnceHandler("tile-drawn", () => setIsReady(true));

        viewerRef.current = viewer;
      })
      .catch(() => {
        setError("Deep zoom viewer could not load.");
      });

    return () => {
      cancelled = true;
      viewer?.destroy();
      if (viewerRef.current === viewer) {
        viewerRef.current = null;
      }
    };
  }, [previewUrl, tileSourceUrl]);

  function zoomBy(factor: number) {
    const viewport = viewerRef.current?.viewport;
    if (!viewport) return;
    viewport.zoomBy(factor);
    viewport.applyConstraints();
  }

  function resetZoom() {
    viewerRef.current?.viewport.goHome();
  }

  function openFullscreen() {
    viewerRef.current?.setFullScreen(true);
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {imageCount.toLocaleString()} works - {width.toLocaleString()} x{" "}
            {height.toLocaleString()} px
          </p>
          {description && (
            <figcaption className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {description}
            </figcaption>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => zoomBy(0.72)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="Reset view"
            aria-label="Reset view"
            onClick={resetZoom}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.38)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="Fullscreen"
            aria-label="Fullscreen"
            onClick={openFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative h-[70vh] min-h-[360px] max-h-[760px] bg-black">
        <div ref={containerRef} className="h-full w-full" />
        {previewUrl && showPreview && (
          <img
            src={previewUrl}
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
              isReady ? "opacity-0" : "opacity-100"
            }`}
            onError={() => setShowPreview(false)}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/80">
            {error}
          </div>
        )}
      </div>
    </figure>
  );
}
