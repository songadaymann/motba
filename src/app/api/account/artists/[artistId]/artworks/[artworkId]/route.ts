import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  getArtworkForArtist,
  getEditableArtistMembership,
  updateArtwork,
} from "@/lib/d1";
import { artistUploadFolder, isCloudinaryIdInFolder } from "@/lib/cloudinary/uploads";
import {
  enforceRateLimit,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";

const artworkSchema = z.object({
  description: z.string().trim().max(4000).optional().nullable(),
  external_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  hero_image_cloudinary_id: z.string().trim().max(300).optional().nullable(),
});

async function getSession(request: NextRequest) {
  return getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
}

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ artistId: string; artworkId: string }> }
) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to edit this project." }, { status: 401 });
  }

  const { artistId, artworkId } = await params;
  const membership = await getEditableArtistMembership({
    userId: session.user.id,
    artistId,
  });
  if (!membership) {
    return NextResponse.json({ error: "Artist profile access denied." }, { status: 403 });
  }

  try {
    await enforceRateLimit({
      action: "artist-artwork-save-user",
      identifier: `${session.user.id}:${artistId}:${artworkId}`,
      limit: 240,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const artwork = await getArtworkForArtist({ artistId, artworkId });
  if (!artwork) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = artworkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the project fields and try again." }, { status: 400 });
  }

  const nextHeroId = cleanOptionalText(parsed.data.hero_image_cloudinary_id);
  if (
    nextHeroId &&
    nextHeroId !== artwork.hero_image_cloudinary_id &&
    !isCloudinaryIdInFolder(nextHeroId, artistUploadFolder(artistId))
  ) {
    return NextResponse.json({ error: "Invalid project image upload." }, { status: 400 });
  }

  const updated = await updateArtwork(artworkId, {
    description:
      parsed.data.description === undefined
        ? undefined
        : cleanOptionalText(parsed.data.description),
    external_url:
      parsed.data.external_url === undefined
        ? undefined
        : cleanOptionalText(parsed.data.external_url),
    hero_image_cloudinary_id:
      parsed.data.hero_image_cloudinary_id === undefined ? undefined : nextHeroId,
  });

  return NextResponse.json({ artwork: updated });
}
