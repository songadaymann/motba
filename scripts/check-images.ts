import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const R2_PUBLIC_URL = "https://pub-f6ad53a541b04e8aa66fe5e0dad12eb8.r2.dev";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkImages() {
  // Query JK Keller images
  console.log("\n=== JK Keller Images ===");
  const { data: jkImages, error: jkError } = await supabase
    .from("artwork_images")
    .select("id, cloudinary_public_id, alt_text")
    .eq("artwork_id", "cf09c78a-7e78-4703-9658-1add6be5da9f");

  if (jkError) {
    console.error("Error fetching JK Keller images:", jkError);
  } else {
    console.log(`Found ${jkImages?.length || 0} images for JK Keller`);
    jkImages?.forEach((img) => {
      console.log(`\nID: ${img.id}`);
      console.log(`cloudinary_public_id: ${img.cloudinary_public_id}`);
      console.log(`alt_text: ${img.alt_text}`);

      // Generate R2 URL following the logic
      let key = img.cloudinary_public_id;
      if (key.startsWith("motba/")) {
        key = key.substring(6); // Remove "motba/" prefix
      }
      // Add .jpg if no extension
      if (!key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        key = key + ".jpg";
      }
      const r2Url = `${R2_PUBLIC_URL}/${key}`;
      console.log(`Generated R2 URL: ${r2Url}`);
    });
  }

  // Query Beeple images
  console.log("\n\n=== Beeple Images (first 5) ===");
  const { data: beepleImages, error: beepleError } = await supabase
    .from("artwork_images")
    .select("id, cloudinary_public_id, alt_text")
    .eq("artwork_id", "8177a59e-3aa2-4e25-b141-2b40d0d088b6")
    .limit(5);

  if (beepleError) {
    console.error("Error fetching Beeple images:", beepleError);
  } else {
    console.log(`Found ${beepleImages?.length || 0} images for Beeple (showing first 5)`);
    beepleImages?.forEach((img) => {
      console.log(`\nID: ${img.id}`);
      console.log(`cloudinary_public_id: ${img.cloudinary_public_id}`);
      console.log(`alt_text: ${img.alt_text}`);

      // Generate R2 URL following the logic
      let key = img.cloudinary_public_id;
      if (key.startsWith("motba/")) {
        key = key.substring(6); // Remove "motba/" prefix
      }
      // Add .jpg if no extension
      if (!key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        key = key + ".jpg";
      }
      const r2Url = `${R2_PUBLIC_URL}/${key}`;
      console.log(`Generated R2 URL: ${r2Url}`);
    });
  }
}

checkImages().catch(console.error);
