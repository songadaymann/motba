/**
 * Seed script: parses enriched CSVs and inserts into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-database.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in .env.local (or environment).
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  console.error("Make sure .env.local is loaded or set them in the env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CSV_DIR = path.resolve(__dirname, "../../enriched-csvs");

const CATEGORY_MAP: Record<string, string> = {
  Music: "music",
  Art: "art",
  Writing: "writing",
  Performance: "performance",
  Photography: "photography",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

function parseDateComponents(dateStr: string | undefined): {
  year: number | null;
  month: number | null;
  day: number | null;
} {
  if (!dateStr || dateStr.trim() === "")
    return { year: null, month: null, day: null };

  const trimmed = dateStr.trim();

  // Full ISO date: "2009-01-01"
  const fullMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullMatch) {
    return {
      year: parseInt(fullMatch[1]),
      month: parseInt(fullMatch[2]),
      day: parseInt(fullMatch[3]),
    };
  }

  // Year-month: "2017-10"
  const ymMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (ymMatch) {
    return {
      year: parseInt(ymMatch[1]),
      month: parseInt(ymMatch[2]),
      day: null,
    };
  }

  // Year only: "1965" or "2040"
  const yMatch = trimmed.match(/^(\d{4})$/);
  if (yMatch) {
    return { year: parseInt(yMatch[1]), month: null, day: null };
  }

  return { year: null, month: null, day: null };
}

interface CsvRow {
  Artist: string;
  Artwork: string;
  Years: string;
  "Start Date": string;
  "End Date": string;
  Link: string;
  Notes: string;
  Status: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const csvFiles = fs.readdirSync(CSV_DIR).filter((f) => f.endsWith(".csv"));
  console.log(`Found ${csvFiles.length} CSV files in ${CSV_DIR}`);

  // Track artists by name to avoid duplicates
  const artistSlugs = new Map<string, string>(); // name -> slug
  const artistIds = new Map<string, string>(); // slug -> uuid

  let artistCount = 0;
  let artworkCount = 0;
  let skippedCount = 0;

  for (const file of csvFiles) {
    // Extract category from filename: "LONG PROJECTS - Music.csv" -> "music"
    const categoryMatch = file.match(/LONG PROJECTS - (\w+)\.csv/);
    if (!categoryMatch) {
      console.log(`  Skipping ${file} (doesn't match expected pattern)`);
      continue;
    }
    const category = CATEGORY_MAP[categoryMatch[1]];
    if (!category) {
      console.log(`  Skipping ${file} (unknown category: ${categoryMatch[1]})`);
      continue;
    }

    console.log(`\nProcessing: ${file} (category: ${category})`);

    const csvContent = fs.readFileSync(path.join(CSV_DIR, file), "utf8");
    const rows: CsvRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for (const row of rows) {
      const artistName = row.Artist?.trim();
      const artworkTitle = row.Artwork?.trim();

      // Skip empty rows and NEEDS INPUT rows
      if (!artistName || artistName.startsWith("NEEDS INPUT")) {
        if (artistName) {
          console.log(`  SKIPPED: ${artistName}`);
        }
        skippedCount++;
        continue;
      }

      // Skip rows with no artwork title
      if (!artworkTitle) {
        console.log(`  SKIPPED: ${artistName} (no artwork title)`);
        skippedCount++;
        continue;
      }

      // ---- Artist ----
      const artistSlug = slugify(artistName);

      if (!artistIds.has(artistSlug)) {
        // Extract website from the link if it looks like an artist site
        const websiteUrl = row.Link?.trim() || null;

        const { data: artistData, error: artistError } = await supabase
          .from("artists")
          .upsert(
            {
              name: artistName,
              slug: artistSlug,
              website_url: websiteUrl,
              is_active: true,
            },
            { onConflict: "slug" }
          )
          .select("id")
          .single();

        if (artistError) {
          console.error(
            `  ERROR creating artist ${artistName}:`,
            artistError.message
          );
          continue;
        }

        artistIds.set(artistSlug, artistData.id);
        artistSlugs.set(artistName, artistSlug);
        artistCount++;
        console.log(`  + Artist: ${artistName} (${artistSlug})`);
      }

      const artistId = artistIds.get(artistSlug)!;

      // ---- Artwork ----
      const artworkSlug = slugify(`${artistName}-${artworkTitle}`);

      const startDate = parseDateComponents(row["Start Date"]);
      const endDate = parseDateComponents(row["End Date"]);

      const yearsDisplay = row.Years?.trim() || null;
      const isOngoing = yearsDisplay
        ? yearsDisplay.toLowerCase().includes("now")
        : false;

      // Map status
      let status: "verified" | "needs_verification" | "needs_input" =
        "needs_verification";
      const rowStatus = row.Status?.trim().toLowerCase();
      if (rowStatus === "verified") status = "verified";
      else if (rowStatus === "needs_input") status = "needs_input";

      const { error: artworkError } = await supabase
        .from("artworks")
        .upsert(
          {
            artist_id: artistId,
            title: artworkTitle,
            slug: artworkSlug,
            category: category,
            years_display: yearsDisplay,
            start_year: startDate.year,
            start_month: startDate.month,
            start_day: startDate.day,
            end_year: endDate.year,
            end_month: endDate.month,
            end_day: endDate.day,
            is_ongoing: isOngoing,
            description: row.Notes?.trim() || null,
            external_url: row.Link?.trim() || null,
            status: status,
          },
          { onConflict: "slug" }
        );

      if (artworkError) {
        console.error(
          `  ERROR creating artwork ${artworkTitle}:`,
          artworkError.message
        );
        continue;
      }

      artworkCount++;
      console.log(
        `    + Artwork: ${artworkTitle} [${yearsDisplay}] (${status})`
      );
    }
  }

  console.log("\n========================================");
  console.log(`Seed complete!`);
  console.log(`  Artists created/updated: ${artistCount}`);
  console.log(`  Artworks created/updated: ${artworkCount}`);
  console.log(`  Rows skipped: ${skippedCount}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
