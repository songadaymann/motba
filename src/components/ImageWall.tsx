"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { ImageLightbox, type LightboxImage } from "./ImageLightbox";

interface WallImage {
  id: string;
  cloudinary_public_id: string;
  alt_text: string | null;
  caption?: string | null;
}

interface ImageWallProps {
  images: WallImage[];
  columns?: number;
  fallbackAlt: string;
}

/**
 * Renders a dense grid of square thumbnails with chunked lazy loading.
 * Images are split into chunks (~50 rows each). A sentinel element at the
 * start of each chunk triggers loading via IntersectionObserver when the
 * user scrolls within 800px of it.
 *
 * Clicking any thumbnail opens a full-screen lightbox.
 */
export function ImageWall({
  images,
  columns = 10,
  fallbackAlt,
}: ImageWallProps) {
  const ROWS_PER_CHUNK = 50;
  const imagesPerChunk = columns * ROWS_PER_CHUNK;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Split images into chunks
  const chunks = useMemo(() => {
    const result: WallImage[][] = [];
    for (let i = 0; i < images.length; i += imagesPerChunk) {
      result.push(images.slice(i, i + imagesPerChunk));
    }
    return result;
  }, [images, imagesPerChunk]);

  const handleImageClick = useCallback(
    (globalIndex: number) => setLightboxIndex(globalIndex),
    []
  );

  return (
    <>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {chunks.map((chunk, i) => (
          <LazyChunk
            key={i}
            images={chunk}
            fallbackAlt={fallbackAlt}
            columns={columns}
            // First chunk loads immediately (above the fold)
            immediate={i === 0}
            startIndex={i * imagesPerChunk}
            onImageClick={handleImageClick}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          fallbackAlt={fallbackAlt}
        />
      )}
    </>
  );
}

function LazyChunk({
  images,
  fallbackAlt,
  columns,
  immediate,
  startIndex,
  onImageClick,
}: {
  images: WallImage[];
  fallbackAlt: string;
  columns: number;
  immediate: boolean;
  startIndex: number;
  onImageClick: (globalIndex: number) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  if (!visible) {
    // Render a sentinel div that spans the full grid width,
    // plus placeholder cells to maintain grid height
    const rows = Math.ceil(images.length / columns);
    return (
      <>
        <div
          ref={sentinelRef}
          style={{ gridColumn: `1 / -1`, height: "1px" }}
          aria-hidden
        />
        {/* Placeholder rows to reserve space so scrollbar stays stable */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="bg-muted aspect-square"
            style={{ gridColumn: `1 / -1`, aspectRatio: `${columns} / 1` }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {images.map((img, i) => (
        <img
          key={img.id}
          src={cloudinaryUrl(img.cloudinary_public_id, "wall")}
          alt={img.alt_text || fallbackAlt}
          className="w-full aspect-square object-cover bg-muted cursor-pointer hover:opacity-80 transition-opacity"
          loading="lazy"
          decoding="async"
          onClick={() => onImageClick(startIndex + i)}
        />
      ))}
    </>
  );
}
