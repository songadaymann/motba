// Image serving configuration
// Currently serves from Cloudflare R2 with Cloudinary as fallback

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

export type ImagePreset = "hero" | "thumbnail" | "artist-photo" | "gallery" | "og" | "wall";

// Cloudinary transforms (used as fallback or when R2 is not configured)
const PRESET_TRANSFORMS: Record<ImagePreset, string> = {
  hero: "c_fill,g_auto,ar_16:9,w_1200,q_auto,f_auto",
  thumbnail: "c_fill,g_auto,w_400,h_300,q_auto,f_auto",
  "artist-photo": "c_thumb,g_face,w_400,h_400,q_auto,f_auto",
  gallery: "c_limit,w_1600,q_auto,f_auto",
  og: "c_fill,g_auto,w_1200,h_630,q_auto,f_auto",
  wall: "c_fill,g_auto,w_120,h_120,q_auto,f_auto",
};

/**
 * Convert a Cloudinary public_id to an R2 key.
 * Cloudinary IDs: "motba/artwork-images/artist/id" (no extension)
 * R2 keys: "artwork-images/artist/id.jpg"
 *
 * For hero images / artist photos that may have different folder structures,
 * we handle both cases.
 */
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;

function cloudinaryIdToR2Key(publicId: string): string {
  // Strip leading "motba/" prefix if present
  let key = publicId.startsWith("motba/") ? publicId.slice(6) : publicId;
  // Add .jpg extension only if no recognized image extension is present
  // (avoid matching non-image extensions like .09 in date-based filenames)
  if (!IMAGE_EXTENSIONS.test(key)) {
    key += ".jpg";
  }
  return key;
}

export function cloudinaryUrl(
  publicId: string,
  preset: ImagePreset
): string {
  if (!publicId) return "";

  // Prefer R2 if configured
  if (R2_PUBLIC_URL) {
    const r2Key = cloudinaryIdToR2Key(publicId);
    return `${R2_PUBLIC_URL}/${r2Key}`;
  }

  // Fallback to Cloudinary
  if (!CLOUD_NAME) return "";
  const transform = PRESET_TRANSFORMS[preset];
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${publicId}`;
}

export function cloudinaryResponsiveUrls(
  publicId: string,
  widths: number[] = [320, 640, 960, 1200, 1600]
): string {
  if (!publicId) return "";

  // R2 serves originals — no responsive transforms available without Image Resizing
  if (R2_PUBLIC_URL) {
    const r2Key = cloudinaryIdToR2Key(publicId);
    const url = `${R2_PUBLIC_URL}/${r2Key}`;
    // Return single URL at largest width for srcset compatibility
    return `${url} 1600w`;
  }

  if (!CLOUD_NAME) return "";
  return widths
    .map(
      (w) =>
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_limit,w_${w},q_auto,f_auto/${publicId} ${w}w`
    )
    .join(", ");
}
