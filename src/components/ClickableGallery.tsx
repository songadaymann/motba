"use client";

import { useState } from "react";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { ImageLightbox, type LightboxImage } from "./ImageLightbox";

interface GalleryImage {
  id: string;
  cloudinary_public_id: string;
  caption: string | null;
  alt_text: string | null;
}

interface ClickableGalleryProps {
  images: GalleryImage[];
  fallbackAlt: string;
}

/**
 * A 2-column grid of gallery images with click-to-enlarge lightbox.
 * Used for artworks with <=20 images (larger collections use ImageWall).
 */
export function ClickableGallery({
  images,
  fallbackAlt,
}: ClickableGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((img, i) => (
          <figure
            key={img.id}
            className="overflow-hidden rounded-lg cursor-pointer"
            onClick={() => setLightboxIndex(i)}
          >
            <img
              src={cloudinaryUrl(img.cloudinary_public_id, "gallery")}
              alt={img.alt_text || fallbackAlt}
              className="w-full hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            {img.caption && (
              <figcaption className="mt-2 text-xs text-muted-foreground">
                {img.caption}
              </figcaption>
            )}
          </figure>
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
