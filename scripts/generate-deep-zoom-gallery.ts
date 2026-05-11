import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadLocalEnv } from "./lib/load-env";

type Options = {
  artistSlug: string;
  artworkSlug: string | null;
  sourceDir: string;
  title: string;
  description: string | null;
  gallerySlug: string;
  outDir: string;
  r2Prefix: string;
  bucket: string;
  database: string;
  env: string | null;
  uploadMethod: "aws" | "wrangler";
  thumbSize: number;
  tileSize: number;
  overlap: number;
  columns: number | "auto";
  thumbConcurrency: number;
  uploadConcurrency: number;
  upload: boolean;
  apply: boolean;
  local: boolean;
  keepOutput: boolean;
  cleanOutput: boolean;
  keepIntermediates: boolean;
  keepOnError: boolean;
  dedupe: boolean;
};

type GeneratedGallery = {
  id: string;
  generatedAt: string;
  outputDir: string;
  thumbDir: string;
  rowDir: string;
  manifestPath: string;
  mosaicPath: string;
  previewPath: string;
  tileSourcePath: string;
  manifestKey: string;
  previewKey: string;
  tileSourceKey: string;
  width: number;
  height: number;
  imageCount: number;
  sourceImageCount: number;
  duplicateImageCount: number;
  columns: number;
  rows: number;
};

type DedupeResult = {
  images: string[];
  sourceImageCount: number;
  duplicateImageCount: number;
  duplicateGroupCount: number;
};

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

function usage(): never {
  console.error(`
Usage:
  npm run dzi:generate -- --artist bananakin --artwork bananakin-everydays-bananakin --source ../images/bananakin/archive --title "Bananakin Everydays" --upload --apply

Required:
  --artist       Artist slug in D1
  --source       Folder of source images to tile into one large grid
  --title        Public title for the deep zoom gallery

Optional:
  --artwork      Artwork slug to attach the gallery to
  --slug         Gallery slug; defaults to a slugified title
  --description  Public description
  --thumb-size   Thumbnail square size before tiling, default 320
  --columns      Grid columns, default auto
  --upload       Upload generated DZI files to R2
  --upload-method aws|wrangler
                 Upload method; defaults to aws when R2 S3 credentials are present
  --apply        Upsert the gallery row into D1
  --local        Use local D1/R2 instead of remote
  --keep-output  Keep generated DZI files locally after a successful upload
  --clean-output
                 Delete generated DZI files after a dry run with no upload
  --keep-intermediates
                 Keep large thumbnail and mosaic intermediates
  --keep-on-error
                 Keep generated files if the script fails or is interrupted
  --no-dedupe    Include WordPress thumbnail variants and duplicate filename variants
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

    if (
      [
        "upload",
        "apply",
        "local",
        "remote",
        "keep-output",
        "clean-output",
        "keep-intermediates",
        "keep-on-error",
        "no-cleanup",
        "no-dedupe",
        "help",
      ].includes(key)
    ) {
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

  const artistSlug = values.get("artist");
  const source = values.get("source");
  const title = values.get("title");
  if (!artistSlug || !source || !title) usage();

  const env = values.get("env") ?? null;
  const gallerySlug = values.get("slug") ?? slugify(title);
  const database =
    values.get("database") ??
    (env === "preview"
      ? "motba-db-preview"
      : env === "test"
        ? "motba-db-test"
        : "motba");
  const r2Prefix =
    values.get("prefix") ??
    `deep-zoom/${artistSlug}/${gallerySlug}`;
  const requestedUploadMethod = values.get("upload-method");
  if (
    requestedUploadMethod &&
    requestedUploadMethod !== "aws" &&
    requestedUploadMethod !== "wrangler"
  ) {
    throw new Error("--upload-method must be either aws or wrangler.");
  }

  return {
    artistSlug,
    artworkSlug: values.get("artwork") ?? null,
    sourceDir: path.resolve(values.get("source") ?? source),
    title,
    description: values.get("description") ?? null,
    gallerySlug,
    outDir: path.resolve(values.get("out") ?? ".tmp/deep-zoom"),
    r2Prefix: cleanR2Prefix(r2Prefix),
    bucket: values.get("bucket") ?? "motba",
    database,
    env,
    uploadMethod:
      requestedUploadMethod === "wrangler" || requestedUploadMethod === "aws"
        ? requestedUploadMethod
        : hasR2S3Credentials()
          ? "aws"
          : "wrangler",
    thumbSize: parsePositiveInteger(values.get("thumb-size"), 320, "thumb-size"),
    tileSize: parsePositiveInteger(values.get("tile-size"), 254, "tile-size"),
    overlap: parsePositiveInteger(values.get("overlap"), 1, "overlap"),
    columns: parseColumns(values.get("columns")),
    thumbConcurrency: parsePositiveInteger(
      values.get("thumb-concurrency"),
      4,
      "thumb-concurrency"
    ),
    uploadConcurrency: parsePositiveInteger(
      values.get("upload-concurrency"),
      4,
      "upload-concurrency"
    ),
    upload: flags.has("upload"),
    apply: flags.has("apply"),
    local: flags.has("local") && !flags.has("remote"),
    keepOutput: flags.has("keep-output") || flags.has("no-cleanup"),
    cleanOutput: flags.has("clean-output"),
    keepIntermediates: flags.has("keep-intermediates") || flags.has("no-cleanup"),
    keepOnError: flags.has("keep-on-error") || flags.has("no-cleanup"),
    dedupe: !flags.has("no-dedupe"),
  };
}

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  label: string
) {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`--${label} must be a positive integer.`);
  }
  return parsed;
}

function parseColumns(rawValue: string | undefined): number | "auto" {
  if (!rawValue || rawValue === "auto") return "auto";
  return parsePositiveInteger(rawValue, 0, "columns");
}

function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug || "deep-zoom-gallery";
}

function cleanR2Prefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

function ensureCommand(command: string, installHint: string) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`${command} is not available. ${installHint}`);
  }
}

function hasR2S3Credentials() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_SECRET_ACCESS_KEY
  );
}

function outputDirFor(options: Options) {
  return path.join(options.outDir, options.artistSlug, options.gallerySlug);
}

function assertSafeGeneratedPath(targetPath: string, options: Options) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedOutDir = path.resolve(options.outDir);
  const outDirRoot = path.parse(resolvedOutDir).root;

  if (resolvedOutDir === outDirRoot) {
    throw new Error(`Refusing to use filesystem root as --out: ${resolvedOutDir}`);
  }

  if (
    resolvedTarget === resolvedOutDir ||
    !resolvedTarget.startsWith(`${resolvedOutDir}${path.sep}`)
  ) {
    throw new Error(`Refusing to clean outside --out: ${resolvedTarget}`);
  }
}

function removePath(targetPath: string, label: string) {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`Cleaned ${label}: ${path.relative(process.cwd(), targetPath)}`);
}

function listImages(sourceDir: string): string[] {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Source folder does not exist: ${sourceDir}`);
  }

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  };

  walk(sourceDir);
  return files.sort((a, b) =>
    path.relative(sourceDir, a).localeCompare(path.relative(sourceDir, b), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function imageSortKey(sourceDir: string, filePath: string) {
  return path.relative(sourceDir, filePath).replaceAll(path.sep, "/");
}

function imageStem(filePath: string) {
  const basename = path.basename(filePath);
  return basename.slice(0, basename.length - path.extname(basename).length);
}

function canonicalImageKey(sourceDir: string, filePath: string) {
  const relativePath = imageSortKey(sourceDir, filePath);
  const parsed = path.posix.parse(relativePath);
  let stem = parsed.name;
  let previous = "";

  while (stem !== previous) {
    previous = stem;
    stem = stem
      .replace(/-\d{2,5}x\d{2,5}$/i, "")
      .replace(/-scaled$/i, "")
      .replace(/-rotated$/i, "")
      .replace(/-e\d{10,}$/i, "");
  }

  return path.posix.join(parsed.dir, stem).toLowerCase();
}

function originalImageKey(sourceDir: string, filePath: string) {
  const relativePath = imageSortKey(sourceDir, filePath);
  const parsed = path.posix.parse(relativePath);
  return path.posix.join(parsed.dir, parsed.name).toLowerCase();
}

function imageVariantArea(filePath: string) {
  const match = imageStem(filePath).match(/-(\d{2,5})x(\d{2,5})$/i);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * Number.parseInt(match[2], 10);
}

function isGeneratedVariant(sourceDir: string, filePath: string) {
  return canonicalImageKey(sourceDir, filePath) !== originalImageKey(sourceDir, filePath);
}

function compareDedupeCandidates(sourceDir: string, a: string, b: string) {
  const aVariant = isGeneratedVariant(sourceDir, a);
  const bVariant = isGeneratedVariant(sourceDir, b);
  if (aVariant !== bVariant) return aVariant ? 1 : -1;

  const aArea = imageVariantArea(a) ?? 0;
  const bArea = imageVariantArea(b) ?? 0;
  if (aArea !== bArea) return bArea - aArea;

  const aSize = fs.statSync(a).size;
  const bSize = fs.statSync(b).size;
  if (aSize !== bSize) return bSize - aSize;

  return imageSortKey(sourceDir, a).localeCompare(imageSortKey(sourceDir, b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function dedupeImages(
  images: string[],
  sourceDir: string,
  enabled: boolean
): DedupeResult {
  if (!enabled) {
    return {
      images,
      sourceImageCount: images.length,
      duplicateImageCount: 0,
      duplicateGroupCount: 0,
    };
  }

  const groups = new Map<string, string[]>();
  for (const imagePath of images) {
    const key = canonicalImageKey(sourceDir, imagePath);
    const group = groups.get(key);
    if (group) {
      group.push(imagePath);
    } else {
      groups.set(key, [imagePath]);
    }
  }

  const dedupedImages: string[] = [];
  let duplicateImageCount = 0;
  let duplicateGroupCount = 0;

  for (const group of groups.values()) {
    if (group.length > 1) {
      duplicateGroupCount += 1;
      duplicateImageCount += group.length - 1;
    }
    dedupedImages.push([...group].sort((a, b) => compareDedupeCandidates(sourceDir, a, b))[0]);
  }

  dedupedImages.sort((a, b) =>
    imageSortKey(sourceDir, a).localeCompare(imageSortKey(sourceDir, b), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  return {
    images: dedupedImages,
    sourceImageCount: images.length,
    duplicateImageCount,
    duplicateGroupCount,
  };
}

async function runQueue<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const currentIndex = cursor;
        cursor += 1;
        await worker(items[currentIndex], currentIndex);
      }
    }
  );
  await Promise.all(workers);
}

function runCommand(command: string, args: string[], label: string) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${label} failed.\n${result.stderr || result.stdout || "No command output."}`
    );
  }

  return result.stdout.trim();
}

async function runCommandAsync(command: string, args: string[], label: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed.\n${stderr || stdout || "No command output."}`));
      }
    });
  });
}

function relativeVipsPath(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

async function generateGallery(options: Options): Promise<GeneratedGallery> {
  ensureCommand("vips", "Install it with: brew install vips");

  const sourceImages = listImages(options.sourceDir);
  if (sourceImages.length === 0) {
    throw new Error(`No supported image files found in ${options.sourceDir}`);
  }
  const deduped = dedupeImages(sourceImages, options.sourceDir, options.dedupe);
  const images = deduped.images;

  const outputDir = outputDirFor(options);
  assertSafeGeneratedPath(outputDir, options);
  const thumbDir = path.join(outputDir, "thumbs");
  const rowDir = path.join(outputDir, "rows");
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(thumbDir, { recursive: true });
  fs.mkdirSync(rowDir, { recursive: true });

  const columns =
    options.columns === "auto"
      ? Math.max(1, Math.ceil(Math.sqrt(images.length * 1.6)))
      : options.columns;
  const rows = Math.ceil(images.length / columns);
  const thumbPaths = images.map((_, index) =>
    path.join(thumbDir, `${String(index + 1).padStart(6, "0")}.jpg`)
  );

  if (options.dedupe && deduped.duplicateImageCount > 0) {
    console.log(
      `Found ${deduped.sourceImageCount.toLocaleString()} source images; using ${images.length.toLocaleString()} after removing ${deduped.duplicateImageCount.toLocaleString()} duplicate filename variants across ${deduped.duplicateGroupCount.toLocaleString()} groups.`
    );
  } else {
    console.log(`Found ${images.length.toLocaleString()} source images.`);
  }
  console.log(
    `Creating ${options.thumbSize}px thumbnails with ${options.thumbConcurrency} workers...`
  );
  const thumbnailProgressStep = images.length > 1000 ? 250 : 25;

  await runQueue(images, options.thumbConcurrency, async (imagePath, index) => {
    const thumbPath = thumbPaths[index];
    await runCommandAsync(
      "vips",
      [
        "thumbnail",
        imagePath,
        `${thumbPath}[Q=88]`,
        String(options.thumbSize),
        "--height",
        String(options.thumbSize),
        "--crop",
        "attention",
        "--size",
        "both",
      ],
      `Thumbnail ${index + 1} (${path.basename(imagePath)})`
    );

    if ((index + 1) % thumbnailProgressStep === 0 || index + 1 === images.length) {
      console.log(`  ${index + 1}/${images.length} thumbnails`);
    }
  });

  const mosaicPath = path.join(outputDir, "mosaic.jpg");
  const rowPaths = Array.from({ length: rows }, (_, index) =>
    path.join(rowDir, `${String(index + 1).padStart(5, "0")}.jpg`)
  );

  console.log(`Joining thumbnails into ${rows} rows of up to ${columns} images...`);
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const start = rowIndex * columns;
    const rowThumbPaths = thumbPaths.slice(start, start + columns);
    runCommand(
      "vips",
      [
        "arrayjoin",
        rowThumbPaths.map(relativeVipsPath).join(" "),
        `${rowPaths[rowIndex]}[Q=92]`,
        "--across",
        String(columns),
        "--background",
        "247 245 239",
      ],
      `Mosaic row ${rowIndex + 1}`
    );

    if ((rowIndex + 1) % 10 === 0 || rowIndex + 1 === rows) {
      console.log(`  ${rowIndex + 1}/${rows} rows`);
    }
  }

  console.log(`Joining rows into a ${columns} x ${rows} grid...`);
  runCommand(
    "vips",
    [
      "arrayjoin",
      rowPaths.map(relativeVipsPath).join(" "),
      `${mosaicPath}[Q=92]`,
      "--across",
      "1",
      "--background",
      "247 245 239",
    ],
    "Mosaic generation"
  );

  const width = Number.parseInt(
    runCommand("vipsheader", ["-f", "width", mosaicPath], "Read mosaic width"),
    10
  );
  const height = Number.parseInt(
    runCommand("vipsheader", ["-f", "height", mosaicPath], "Read mosaic height"),
    10
  );

  console.log(`Generating DZI tiles for ${width.toLocaleString()} x ${height.toLocaleString()} mosaic...`);
  const tileBasePath = path.join(outputDir, "mosaic");
  runCommand(
    "vips",
    [
      "dzsave",
      mosaicPath,
      tileBasePath,
      "--tile-size",
      String(options.tileSize),
      "--overlap",
      String(options.overlap),
      "--suffix",
      ".jpg[Q=82]",
    ],
    "DZI generation"
  );

  const id = randomUUID();
  const generatedAt = new Date().toISOString();
  const manifestKey = `${options.r2Prefix}/manifest.json`;
  const previewKey = `${options.r2Prefix}/preview.jpg`;
  const tileSourceKey = `${options.r2Prefix}/mosaic.dzi`;
  const manifestPath = path.join(outputDir, "manifest.json");
  const previewPath = path.join(outputDir, "preview.jpg");
  const tileSourcePath = path.join(outputDir, "mosaic.dzi");

  console.log("Generating preview image...");
  runCommand(
    "vips",
    [
      "thumbnail",
      mosaicPath,
      `${previewPath}[Q=72]`,
      "1200",
    ],
    "Preview generation"
  );

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        schema: "motba.deepZoomGallery.v1",
        id,
        generatedAt,
        artistSlug: options.artistSlug,
        artworkSlug: options.artworkSlug,
        gallerySlug: options.gallerySlug,
        title: options.title,
        description: options.description,
        r2Prefix: options.r2Prefix,
        manifestKey,
        previewKey,
        tileSourceKey,
        sourceImageCount: deduped.sourceImageCount,
        imageCount: images.length,
        dedupe: {
          enabled: options.dedupe,
          method: "wordpress-filename-variants",
          duplicateGroupCount: deduped.duplicateGroupCount,
          duplicateImageCount: deduped.duplicateImageCount,
        },
        columns,
        rows,
        thumbSize: options.thumbSize,
        tileSize: options.tileSize,
        overlap: options.overlap,
        width,
        height,
        sources: images.map((imagePath, index) => ({
          sortOrder: index + 1,
          path: path.relative(options.sourceDir, imagePath).replaceAll(path.sep, "/"),
        })),
      },
      null,
      2
    )}\n`
  );

  if (!options.keepIntermediates) {
    removePath(thumbDir, "generated thumbnails");
    removePath(rowDir, "generated row images");
    removePath(mosaicPath, "generated mosaic");
  } else {
    console.log("Keeping large intermediates because --keep-intermediates was set.");
  }

  return {
    id,
    generatedAt,
    outputDir,
    thumbDir,
    rowDir,
    manifestPath,
    mosaicPath,
    previewPath,
    tileSourcePath,
    manifestKey,
    previewKey,
    tileSourceKey,
    width,
    height,
    imageCount: images.length,
    sourceImageCount: deduped.sourceImageCount,
    duplicateImageCount: deduped.duplicateImageCount,
    columns,
    rows,
  };
}

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  const walk = (currentDir: string) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "thumbs") continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };
  walk(dir);
  return files.sort();
}

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".dzi" || ext === ".xml") return "application/xml; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function wranglerBaseArgs(options: Options) {
  const args = ["wrangler"];
  if (options.env) args.push("--env", options.env);
  return args;
}

async function uploadGeneratedFiles(options: Options, gallery: GeneratedGallery) {
  if (options.uploadMethod === "aws" && !options.local) {
    uploadGeneratedFilesWithAws(options, gallery);
    return;
  }

  const files = walkFiles(gallery.outputDir).filter((file) => file !== gallery.mosaicPath);
  console.log(
    `Uploading ${files.length.toLocaleString()} DZI files to R2 prefix ${options.r2Prefix}...`
  );

  await runQueue(files, options.uploadConcurrency, async (filePath, index) => {
    const relativePath = path
      .relative(gallery.outputDir, filePath)
      .replaceAll(path.sep, "/");
    const objectKey = `${options.r2Prefix}/${relativePath}`;
    await runCommandAsync(
      "npx",
      [
        ...wranglerBaseArgs(options),
        "r2",
        "object",
        "put",
        `${options.bucket}/${objectKey}`,
        "--file",
        filePath,
        "--content-type",
        contentTypeFor(filePath),
        "--cache-control",
        "public, max-age=300",
        options.local ? "--local" : "--remote",
        "--force",
      ],
      `R2 upload ${objectKey}`
    );

    if ((index + 1) % 50 === 0 || index + 1 === files.length) {
      console.log(`  ${index + 1}/${files.length} files uploaded`);
    }
  });
}

function uploadGeneratedFilesWithAws(options: Options, gallery: GeneratedGallery) {
  ensureCommand("aws", "Install it with: brew install awscli");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID, or CLOUDFLARE_SECRET_ACCESS_KEY for aws R2 upload."
    );
  }

  console.log(`Uploading DZI files to R2 prefix ${options.r2Prefix} with aws s3 sync...`);
  const result = spawnSync(
    "aws",
    [
      "s3",
      "sync",
      gallery.outputDir,
      `s3://${options.bucket}/${options.r2Prefix}`,
      "--endpoint-url",
      `https://${accountId}.r2.cloudflarestorage.com`,
      "--region",
      "auto",
      "--cache-control",
      "public, max-age=300",
      "--exclude",
      "mosaic.jpg",
      "--exclude",
      "thumbs/*",
      "--exclude",
      "rows/*",
      "--delete",
      "--only-show-errors",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: accessKeyId,
        AWS_SECRET_ACCESS_KEY: secretAccessKey,
        AWS_DEFAULT_REGION: "auto",
        AWS_EC2_METADATA_DISABLED: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `aws s3 sync failed.\n${result.stderr || result.stdout || "No command output."}`
    );
  }
}

function cleanupAfterSuccess(options: Options, gallery: GeneratedGallery) {
  if (!options.upload && !options.cleanOutput) return;
  if (options.keepOutput) {
    console.log("Keeping local DZI output because --keep-output was set.");
    return;
  }

  assertSafeGeneratedPath(gallery.outputDir, options);
  removePath(gallery.outputDir, "generated DZI output");
}

function cleanupAfterFailure(options: Options) {
  if (options.keepOnError) return;
  const outputDir = outputDirFor(options);
  assertSafeGeneratedPath(outputDir, options);
  removePath(outputDir, "partial generated output");
}

function sqlString(value: string | null) {
  if (value === null) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function buildUpsertSql(options: Options, gallery: GeneratedGallery) {
  const artworkJoin = options.artworkSlug
    ? `JOIN artworks aw ON aw.artist_id = a.id AND aw.slug = ${sqlString(options.artworkSlug)}`
    : "";
  const artworkIdValue = options.artworkSlug ? "aw.id" : "NULL";

  return `
INSERT INTO deep_zoom_galleries (
  id,
  artist_id,
  artwork_id,
  slug,
  title,
  description,
  manifest_key,
  tile_source_key,
  r2_prefix,
  width,
  height,
  tile_size,
  overlap,
  image_count,
  is_active,
  sort_order,
  generated_at
)
SELECT
  ${sqlString(gallery.id)},
  a.id,
  ${artworkIdValue},
  ${sqlString(options.gallerySlug)},
  ${sqlString(options.title)},
  ${sqlString(options.description)},
  ${sqlString(gallery.manifestKey)},
  ${sqlString(gallery.tileSourceKey)},
  ${sqlString(options.r2Prefix)},
  ${gallery.width},
  ${gallery.height},
  ${options.tileSize},
  ${options.overlap},
  ${gallery.imageCount},
  1,
  0,
  ${sqlString(gallery.generatedAt)}
FROM artists a
${artworkJoin}
WHERE a.slug = ${sqlString(options.artistSlug)}
ON CONFLICT(artist_id, slug) DO UPDATE SET
  artwork_id = excluded.artwork_id,
  title = excluded.title,
  description = excluded.description,
  manifest_key = excluded.manifest_key,
  tile_source_key = excluded.tile_source_key,
  r2_prefix = excluded.r2_prefix,
  width = excluded.width,
  height = excluded.height,
  tile_size = excluded.tile_size,
  overlap = excluded.overlap,
  image_count = excluded.image_count,
  is_active = 1,
  generated_at = excluded.generated_at;
`.trim();
}

function applyGalleryRow(options: Options, gallery: GeneratedGallery) {
  console.log(`Upserting D1 gallery row in ${options.database}...`);
  const sql = buildUpsertSql(options, gallery);
  const args = [
    ...wranglerBaseArgs(options),
    "d1",
    "execute",
    options.database,
    options.local ? "--local" : "--remote",
    "--command",
    sql,
    "--yes",
  ];

  runCommand("npx", args, "D1 upsert");
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  registerCleanupSignals(options);
  const gallery = await generateGallery(options);

  if (options.upload) {
    await uploadGeneratedFiles(options, gallery);
  }

  if (options.apply) {
    applyGalleryRow(options, gallery);
  }

  cleanupAfterSuccess(options, gallery);

  console.log("\nDeep zoom gallery generated.");
  console.log(
    `  Output: ${
      fs.existsSync(gallery.outputDir)
        ? path.relative(process.cwd(), gallery.outputDir)
        : "cleaned"
    }`
  );
  console.log(`  Manifest key: ${gallery.manifestKey}`);
  console.log(`  Tile source key: ${gallery.tileSourceKey}`);

  if (!options.upload) {
    console.log("  R2 upload skipped. Add --upload to publish the tiles.");
  }
  if (!options.apply) {
    console.log("  D1 upsert skipped. Add --apply to show it on the site.");
  }
}

function registerCleanupSignals(options: Options) {
  const cleanupAndExit = (signal: NodeJS.Signals, exitCode: number) => {
    console.error(`\nReceived ${signal}; cleaning generated output before exit.`);
    try {
      cleanupAfterFailure(options);
    } catch (cleanupError) {
      const message =
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.error(`Cleanup failed: ${message}`);
    }
    process.exit(exitCode);
  };

  process.once("SIGINT", () => cleanupAndExit("SIGINT", 130));
  process.once("SIGTERM", () => cleanupAndExit("SIGTERM", 143));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n${message}`);
  try {
    const options = parseArgs(process.argv.slice(2));
    cleanupAfterFailure(options);
  } catch {
    // Avoid hiding the original error with cleanup or argument parsing failures.
  }
  process.exit(1);
});
