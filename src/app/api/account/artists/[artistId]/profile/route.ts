import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  getArtistById,
  getEditableArtistMembership,
  updateArtist,
} from "@/lib/d1";
import { artistUploadFolder, isCloudinaryIdInFolder } from "@/lib/cloudinary/uploads";
import {
  enforceRateLimit,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";

const profileSchema = z.object({
  bio: z.string().trim().max(2000).optional().nullable(),
  website_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  artist_photo_cloudinary_id: z.string().trim().max(300).optional().nullable(),
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
  { params }: { params: Promise<{ artistId: string }> }
) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to edit this profile." }, { status: 401 });
  }

  const { artistId } = await params;
  const membership = await getEditableArtistMembership({
    userId: session.user.id,
    artistId,
  });
  if (!membership) {
    return NextResponse.json({ error: "Artist profile access denied." }, { status: 403 });
  }

  try {
    await enforceRateLimit({
      action: "artist-profile-save-user",
      identifier: `${session.user.id}:${artistId}`,
      limit: 240,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the profile fields and try again." }, { status: 400 });
  }

  const currentArtist = await getArtistById(artistId);
  if (!currentArtist) {
    return NextResponse.json({ error: "Artist not found." }, { status: 404 });
  }

  const nextPhotoId = cleanOptionalText(parsed.data.artist_photo_cloudinary_id);
  if (
    nextPhotoId &&
    nextPhotoId !== currentArtist.artist_photo_cloudinary_id &&
    !isCloudinaryIdInFolder(nextPhotoId, artistUploadFolder(artistId))
  ) {
    return NextResponse.json({ error: "Invalid artist photo upload." }, { status: 400 });
  }

  const artist = await updateArtist(artistId, {
    bio: parsed.data.bio === undefined ? undefined : cleanOptionalText(parsed.data.bio),
    website_url:
      parsed.data.website_url === undefined
        ? undefined
        : cleanOptionalText(parsed.data.website_url),
    artist_photo_cloudinary_id:
      parsed.data.artist_photo_cloudinary_id === undefined ? undefined : nextPhotoId,
  });

  return NextResponse.json({ artist });
}
