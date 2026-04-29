/**
 * Upload images to Cloudinary and update Supabase records.
 *
 * Usage:
 *   npx tsx scripts/upload-images.ts
 *
 * Expects images in ../images/ with naming: artist_slug_hero.ext or artist_slug_profile.ext
 * Requires .env.local with Cloudinary + Supabase credentials.
 */

import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const IMAGES_DIR = path.resolve(__dirname, "../../images");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Get list of image files (skip .DS_Store, .mov — we already converted .mov to .gif)
  const files = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"].includes(ext);
    })
    .filter((f) => !f.startsWith("."));

  console.log(`Found ${files.length} images in ${IMAGES_DIR}\n`);

  // Fetch all artists from Supabase to map names to IDs
  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, slug, artist_photo_cloudinary_id");

  const { data: artworks } = await supabase
    .from("artworks")
    .select("id, slug, artist_id, hero_image_cloudinary_id");

  if (!artists || !artworks) {
    console.error("Failed to fetch artists/artworks from Supabase");
    process.exit(1);
  }

  // Build lookup: slug -> artist
  const artistBySlug = new Map(artists.map((a) => [a.slug, a]));

  // Build lookup: artist_id -> artworks
  const artworksByArtistId = new Map<string, typeof artworks>();
  for (const aw of artworks) {
    const list = artworksByArtistId.get(aw.artist_id) || [];
    list.push(aw);
    artworksByArtistId.set(aw.artist_id, list);
  }

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  let dbUpdates = 0;

  for (const file of files) {
    const ext = path.extname(file);
    const baseName = path.basename(file, ext); // e.g. "jonathan_mann_hero"

    // Parse: everything before _hero or _profile is the artist slug
    const heroMatch = baseName.match(/^(.+)_hero$/);
    const profileMatch = baseName.match(/^(.+)_profile$/);

    if (!heroMatch && !profileMatch) {
      console.log(`  SKIP: ${file} (doesn't match _hero/_profile pattern)`);
      skipped++;
      continue;
    }

    const isHero = !!heroMatch;
    const rawSlug = (heroMatch?.[1] || profileMatch?.[1])!;
    // Cloudinary public ID: motba/heroes/artist-slug or motba/profiles/artist-slug
    const folder = isHero ? "motba/heroes" : "motba/profiles";
    const publicId = `${folder}/${rawSlug}`;

    const filePath = path.join(IMAGES_DIR, file);

    console.log(`  Uploading: ${file} -> ${publicId}`);

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
        resource_type: ext === ".gif" ? "image" : "image",
      });

      console.log(`    OK: ${result.secure_url} (${result.width}x${result.height}, ${(result.bytes / 1024).toFixed(0)}KB)`);
      uploaded++;

      // Now update Supabase
      // Try to find the artist by matching the raw slug
      // The file slug might differ slightly from DB slug, so try variations
      const artist = artistBySlug.get(rawSlug) ||
        artistBySlug.get(rawSlug.replace(/_/g, "-")) ||
        // Try partial match
        [...artistBySlug.values()].find((a) =>
          a.slug === rawSlug.replace(/_/g, "-") ||
          rawSlug.replace(/_/g, "-").includes(a.slug) ||
          a.slug.includes(rawSlug.replace(/_/g, "-"))
        );

      if (!artist) {
        console.log(`    WARNING: No artist found for slug "${rawSlug}"`);
        continue;
      }

      if (isHero) {
        // Update the artist's artworks with this hero image
        const artistArtworks = artworksByArtistId.get(artist.id) || [];
        for (const aw of artistArtworks) {
          if (!aw.hero_image_cloudinary_id) {
            const { error } = await supabase
              .from("artworks")
              .update({ hero_image_cloudinary_id: result.public_id })
              .eq("id", aw.id);

            if (error) {
              console.log(`    DB ERROR (artwork ${aw.slug}): ${error.message}`);
            } else {
              console.log(`    DB: Set hero image on artwork "${aw.slug}"`);
              dbUpdates++;
            }
          }
        }
      } else {
        // Update artist profile photo
        if (!artist.artist_photo_cloudinary_id) {
          const { error } = await supabase
            .from("artists")
            .update({ artist_photo_cloudinary_id: result.public_id })
            .eq("id", artist.id);

          if (error) {
            console.log(`    DB ERROR (artist ${artist.slug}): ${error.message}`);
          } else {
            console.log(`    DB: Set profile photo on artist "${artist.slug}"`);
            dbUpdates++;
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`    ERROR: ${message}`);
      errors++;
    }
  }

  console.log("\n========================================");
  console.log("Upload complete!");
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  DB updates: ${dbUpdates}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Upload script failed:", err);
  process.exit(1);
});
