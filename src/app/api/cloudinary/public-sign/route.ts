import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { getEditableArtistMembership } from "@/lib/d1";
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";

const schema = z.object({
  paramsToSign: z.record(z.string(), z.unknown()),
});

const SUBMISSION_FOLDER_PATTERN =
  /^motba\/submissions\/([a-z0-9-]{16,80})$/i;
const START_FOLDER_PATTERN =
  /^motba\/start\/([a-z0-9-]{16,80})\/([a-z0-9-]{16,80})$/i;
const ARTIST_FOLDER_PATTERN =
  /^motba\/artists\/([a-z0-9-]{16,80})$/i;
const ALLOWED_PARAMS = new Set(["folder", "source", "timestamp"]);
const BLOCKED_PARAMS = new Set([
  "eager",
  "overwrite",
  "public_id",
  "transformation",
  "raw_convert",
  "responsive_breakpoints",
]);

function isScalarUploadParam(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isFreshTimestamp(value: unknown) {
  const timestamp = Number(value);
  if (!Number.isInteger(timestamp)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(nowSeconds - timestamp) <= 60 * 60;
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid upload origin." }, { status: 403 });
  }

  const { paramsToSign } = parsed.data;
  const folder = paramsToSign.folder;

  if (typeof folder !== "string") {
    return NextResponse.json({ error: "Invalid upload folder." }, { status: 400 });
  }

  const submissionMatch = folder.match(SUBMISSION_FOLDER_PATTERN);
  const startMatch = folder.match(START_FOLDER_PATTERN);
  const artistMatch = folder.match(ARTIST_FOLDER_PATTERN);
  if (!submissionMatch && !startMatch && !artistMatch) {
    return NextResponse.json({ error: "Invalid upload folder." }, { status: 400 });
  }

  if (!isFreshTimestamp(paramsToSign.timestamp)) {
    return NextResponse.json({ error: "Invalid upload timestamp." }, { status: 400 });
  }

  if (startMatch || artistMatch) {
    const session = await getSessionFromCookieValue(
      request.cookies.get(SESSION_COOKIE)?.value
    );
    if (!session) {
      return NextResponse.json({ error: "Sign in to upload images." }, { status: 401 });
    }

    if (startMatch && startMatch[1] !== session.user.id) {
      return NextResponse.json({ error: "Invalid upload folder." }, { status: 403 });
    }

    if (artistMatch) {
      const artistId = artistMatch[1];
      const membership = await getEditableArtistMembership({
        userId: session.user.id,
        artistId,
      });
      if (!membership) {
        return NextResponse.json({ error: "Artist profile access denied." }, { status: 403 });
      }
    }

    try {
      await enforceRateLimit({
        action: artistMatch ? "cloudinary-artist-user" : "cloudinary-start-user",
        identifier: artistMatch ? `${session.user.id}:${artistMatch[1]}` : session.user.id,
        limit: 80,
        windowSeconds: 60 * 60,
      });
    } catch (error) {
      if (error instanceof RateLimitError) return rateLimitResponse(error);
      throw error;
    }
  } else {
    try {
      await enforceRateLimit({
        action: "cloudinary-submission-ip",
        identifier: getClientIp(request),
        limit: 30,
        windowSeconds: 60 * 60,
      });
      await enforceRateLimit({
        action: "cloudinary-submission-folder",
        identifier: folder,
        limit: 8,
        windowSeconds: 60 * 60,
      });
    } catch (error) {
      if (error instanceof RateLimitError) return rateLimitResponse(error);
      throw error;
    }
  }

  for (const param of Object.keys(paramsToSign)) {
    if (BLOCKED_PARAMS.has(param) || !ALLOWED_PARAMS.has(param)) {
      return NextResponse.json({ error: "Unsupported upload option." }, { status: 400 });
    }
  }

  const params = Object.fromEntries(
    Object.entries(paramsToSign).filter(([, value]) => isScalarUploadParam(value))
  );

  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({ signature });
}
