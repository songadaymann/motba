import * as fs from "fs";
import * as path from "path";
import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

type ExportShape = {
  tables: {
    artists: Array<{ artist_photo_cloudinary_id: string | null }>;
    artworks: Array<{ hero_image_cloudinary_id: string | null }>;
    artwork_images: Array<{ cloudinary_public_id: string }>;
  };
};

const INPUT_PATH =
  process.argv[2] || path.resolve(process.cwd(), ".tmp/supabase-export.json");
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const CONCURRENCY = 12;

if (!R2_PUBLIC_URL) {
  console.error("Missing NEXT_PUBLIC_R2_PUBLIC_URL");
  process.exit(1);
}

const exportData = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8")) as ExportShape;

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;

function cloudinaryIdToR2Key(publicId: string): string {
  let key = publicId.startsWith("motba/") ? publicId.slice(6) : publicId;
  if (!IMAGE_EXTENSIONS.test(key)) {
    key += ".jpg";
  }
  return key;
}

async function checkKey(key: string) {
  const res = await fetch(`${R2_PUBLIC_URL}/${key}`, { method: "HEAD" });
  return {
    key,
    ok: res.ok,
    status: res.status,
  };
}

async function main() {
  const ids = new Set<string>();

  for (const artist of exportData.tables.artists || []) {
    if (artist.artist_photo_cloudinary_id) ids.add(artist.artist_photo_cloudinary_id);
  }

  for (const artwork of exportData.tables.artworks || []) {
    if (artwork.hero_image_cloudinary_id) ids.add(artwork.hero_image_cloudinary_id);
  }

  for (const image of exportData.tables.artwork_images || []) {
    if (image.cloudinary_public_id) ids.add(image.cloudinary_public_id);
  }

  const keys = [...ids].map(cloudinaryIdToR2Key);
  const missing: Array<{ key: string; status: number }> = [];

  for (let index = 0; index < keys.length; index += CONCURRENCY) {
    const chunk = keys.slice(index, index + CONCURRENCY);
    const results = await Promise.all(chunk.map(checkKey));
    for (const result of results) {
      if (!result.ok) {
        missing.push({ key: result.key, status: result.status });
      }
    }
    console.log(`Checked ${Math.min(index + CONCURRENCY, keys.length)} / ${keys.length}`);
  }

  console.log(`\nAudited ${keys.length} derived R2 keys`);
  console.log(`Missing: ${missing.length}`);

  for (const item of missing.slice(0, 20)) {
    console.log(`  ${item.status} ${item.key}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
