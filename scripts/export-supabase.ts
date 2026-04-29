import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_PATH =
  process.argv[2] || path.resolve(process.cwd(), ".tmp/supabase-export.json");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const TABLES = [
  "artists",
  "artworks",
  "artwork_images",
  "artwork_links",
  "submissions",
] as const;

const PAGE_SIZE = 1000;

async function exportTable(table: (typeof TABLES)[number]) {
  const rows: unknown[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to export ${table}: ${error.message}`);
    }

    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  const output = {
    exported_at: new Date().toISOString(),
    source: SUPABASE_URL,
    tables: {} as Record<(typeof TABLES)[number], unknown[]>,
  };

  for (const table of TABLES) {
    console.log(`Exporting ${table}...`);
    output.tables[table] = await exportTable(table);
    console.log(`  ${table}: ${output.tables[table].length} rows`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nExport written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
