import { spawnSync } from "node:child_process";
import { loadLocalEnv } from "./lib/load-env";

type Options = {
  database: string;
  env: string | null;
  local: boolean;
  apply: boolean;
};

type ArtworkImageRow = {
  id: string;
  artwork_id: string;
  cloudinary_public_id: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
  artwork_slug: string;
  artist_slug: string;
};

type DuplicateGroup = {
  key: string;
  keep: ArtworkImageRow;
  remove: ArtworkImageRow[];
};

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "gif",
  "heic",
  "jpeg",
  "jpg",
  "png",
  "tif",
  "tiff",
  "webp",
]);

function usage(): never {
  console.error(`
Usage:
  npm run images:dedupe:d1 -- --apply

Options:
  --apply      Delete duplicate artwork_images rows. Without this, dry-run only.
  --local      Use local D1 instead of remote.
  --env        Wrangler environment.
  --database   D1 database name, default motba.
`);
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) usage();

    const equalsIndex = arg.indexOf("=");
    const key = equalsIndex === -1 ? arg.slice(2) : arg.slice(2, equalsIndex);
    const inlineValue = equalsIndex === -1 ? null : arg.slice(equalsIndex + 1);

    if (["apply", "local", "remote", "help"].includes(key)) {
      flags.add(key);
      if (inlineValue !== null) values.set(key, inlineValue);
      continue;
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    values.set(key, value);
    if (inlineValue === null) index += 1;
  }

  if (flags.has("help")) usage();

  const env = values.get("env") ?? null;
  return {
    database:
      values.get("database") ??
      (env === "preview"
        ? "motba-db-preview"
        : env === "test"
          ? "motba-db-test"
          : "motba"),
    env,
    local: flags.has("local") && !flags.has("remote"),
    apply: flags.has("apply"),
  };
}

function wranglerBaseArgs(options: Options) {
  const args = ["wrangler"];
  if (options.env) args.push("--env", options.env);
  return args;
}

function runWranglerJson<T>(options: Options, sql: string): T[] {
  const result = spawnSync(
    "npx",
    [
      ...wranglerBaseArgs(options),
      "d1",
      "execute",
      options.database,
      options.local ? "--local" : "--remote",
      "--json",
      "--command",
      sql,
      "--yes",
    ],
    {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "wrangler d1 execute failed");
  }

  const payload = JSON.parse(result.stdout) as Array<{
    results: T[];
    success: boolean;
  }>;
  const response = payload[0];
  if (!response?.success) {
    throw new Error(`D1 query failed: ${result.stdout}`);
  }
  return response.results;
}

function runWrangler(options: Options, sql: string) {
  const result = spawnSync(
    "npx",
    [
      ...wranglerBaseArgs(options),
      "d1",
      "execute",
      options.database,
      options.local ? "--local" : "--remote",
      "--command",
      sql,
      "--yes",
    ],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "wrangler d1 execute failed");
  }
}

function stripKnownExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return fileName;
  const extension = fileName.slice(dotIndex + 1).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) return fileName;
  return fileName.slice(0, dotIndex);
}

function splitPublicId(publicId: string) {
  const withoutPrefix = publicId
    .replace(/^motba\/artwork-images\//, "")
    .replace(/^motba\//, "");
  const slashIndex = withoutPrefix.lastIndexOf("/");
  const dir = slashIndex === -1 ? "" : withoutPrefix.slice(0, slashIndex);
  const fileName =
    slashIndex === -1 ? withoutPrefix : withoutPrefix.slice(slashIndex + 1);
  return { dir, stem: stripKnownExtension(fileName) };
}

function canonicalStem(stem: string) {
  let current = stem;
  let previous = "";

  while (current !== previous) {
    previous = current;
    current = current
      .replace(/-\d{2,5}x\d{2,5}$/i, "")
      .replace(/-scaled$/i, "")
      .replace(/-rotated$/i, "")
      .replace(/-e\d{10,}$/i, "");
  }

  return current;
}

function canonicalImageKey(row: ArtworkImageRow) {
  const { dir, stem } = splitPublicId(row.cloudinary_public_id);
  return `${row.artwork_id}|${dir}/${canonicalStem(stem)}`.toLowerCase();
}

function originalImageKey(row: ArtworkImageRow) {
  const { dir, stem } = splitPublicId(row.cloudinary_public_id);
  return `${row.artwork_id}|${dir}/${stem}`.toLowerCase();
}

function isGeneratedVariant(row: ArtworkImageRow) {
  return canonicalImageKey(row) !== originalImageKey(row);
}

function variantArea(row: ArtworkImageRow) {
  const { stem } = splitPublicId(row.cloudinary_public_id);
  const match = stem.match(/-(\d{2,5})x(\d{2,5})$/i);
  if (match) {
    return Number.parseInt(match[1], 10) * Number.parseInt(match[2], 10);
  }
  return (row.width ?? 0) * (row.height ?? 0);
}

function compareKeepCandidate(a: ArtworkImageRow, b: ArtworkImageRow) {
  const aVariant = isGeneratedVariant(a);
  const bVariant = isGeneratedVariant(b);
  if (aVariant !== bVariant) return aVariant ? 1 : -1;

  const aArea = variantArea(a);
  const bArea = variantArea(b);
  if (aArea !== bArea) return bArea - aArea;

  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at.localeCompare(b.created_at);
}

function findDuplicateGroups(rows: ArtworkImageRow[]) {
  const groups = new Map<string, ArtworkImageRow[]>();

  for (const row of rows) {
    const key = canonicalImageKey(row);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, group] of groups) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort(compareKeepCandidate);
    duplicates.push({ key, keep: sorted[0], remove: sorted.slice(1) });
  }

  return duplicates;
}

function summarize(groups: DuplicateGroup[]) {
  const byArtwork = new Map<
    string,
    { artistSlug: string; artworkSlug: string; groups: number; rows: number }
  >();

  for (const group of groups) {
    const existing = byArtwork.get(group.keep.artwork_id) ?? {
      artistSlug: group.keep.artist_slug,
      artworkSlug: group.keep.artwork_slug,
      groups: 0,
      rows: 0,
    };
    existing.groups += 1;
    existing.rows += group.remove.length;
    byArtwork.set(group.keep.artwork_id, existing);
  }

  return [...byArtwork.values()].sort((a, b) => b.rows - a.rows);
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function deleteDuplicates(options: Options, groups: DuplicateGroup[]) {
  const ids = groups.flatMap((group) => group.remove.map((row) => row.id));
  const chunkSize = 200;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    runWrangler(
      options,
      `DELETE FROM artwork_images WHERE id IN (${chunk.map(sqlString).join(", ")});`
    );
    console.log(
      `  deleted ${Math.min(index + chunk.length, ids.length).toLocaleString()}/${ids.length.toLocaleString()} duplicate rows`
    );
  }
}

function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));

  const rows = runWranglerJson<ArtworkImageRow>(
    options,
    `SELECT
       ai.id,
       ai.artwork_id,
       ai.cloudinary_public_id,
       ai.width,
       ai.height,
       ai.sort_order,
       ai.created_at,
       aw.slug AS artwork_slug,
       a.slug AS artist_slug
     FROM artwork_images ai
     JOIN artworks aw ON aw.id = ai.artwork_id
     JOIN artists a ON a.id = aw.artist_id
     ORDER BY aw.slug ASC, ai.sort_order ASC, ai.created_at ASC`
  );

  const duplicateGroups = findDuplicateGroups(rows);
  const duplicateRows = duplicateGroups.reduce(
    (count, group) => count + group.remove.length,
    0
  );
  const summary = summarize(duplicateGroups);

  console.log(`Scanned ${rows.length.toLocaleString()} artwork image rows.`);
  console.log(
    `Found ${duplicateRows.toLocaleString()} duplicate rows across ${duplicateGroups.length.toLocaleString()} groups and ${summary.length.toLocaleString()} artworks.`
  );

  for (const row of summary.slice(0, 20)) {
    console.log(
      `  ${row.artistSlug}/${row.artworkSlug}: ${row.rows.toLocaleString()} duplicate rows in ${row.groups.toLocaleString()} groups`
    );
  }

  for (const group of duplicateGroups.slice(0, 8)) {
    console.log(
      `\nKeep ${group.keep.cloudinary_public_id}\nRemove:\n${group.remove
        .map((row) => `  ${row.cloudinary_public_id}`)
        .join("\n")}`
    );
  }

  if (!options.apply) {
    console.log("\nDry run only. Re-run with --apply to delete duplicate rows.");
    return;
  }

  deleteDuplicates(options, duplicateGroups);
  console.log("\nArtwork image duplicates cleaned.");
}

main();
