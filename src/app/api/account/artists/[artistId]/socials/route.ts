import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  createArtistSocialLink,
  deleteArtistSocialLink,
  getEditableArtistMembership,
  listArtistSocialLinks,
  updateArtistSocialLink,
} from "@/lib/d1";
import {
  enforceRateLimit,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";
import { parseSocialUrl } from "@/lib/social-links";
import type { ArtistSocialLink } from "@/types/database";

const socialSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().max(500).optional(),
  platform: z.string().trim().max(80).optional().nullable(),
  handle: z.string().trim().max(120).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

async function getSession(request: NextRequest) {
  return getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
}

async function requireEditableArtist(request: NextRequest, artistId: string) {
  const session = await getSession(request);
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "Sign in to edit this profile." },
        { status: 401 }
      ),
      session: null,
    };
  }

  const membership = await getEditableArtistMembership({
    userId: session.user.id,
    artistId,
  });
  if (!membership) {
    return {
      response: NextResponse.json(
        { error: "Artist profile access denied." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { response: null, session };
}

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function enforceSocialRateLimit(userId: string, artistId: string) {
  await enforceRateLimit({
    action: "artist-socials-save-user",
    identifier: `${userId}:${artistId}`,
    limit: 300,
    windowSeconds: 60 * 60,
  });
}

async function getOwnedSocialLink(artistId: string, id: string) {
  const links = await listArtistSocialLinks(artistId);
  return links.find((link) => link.id === id) ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  const { artistId } = await params;
  const access = await requireEditableArtist(request, artistId);
  if (access.response) return access.response;

  return NextResponse.json(await listArtistSocialLinks(artistId));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  const { artistId } = await params;
  const access = await requireEditableArtist(request, artistId);
  if (access.response) return access.response;

  try {
    await enforceSocialRateLimit(access.session.user.id, artistId);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = socialSchema.safeParse(body);
  if (!parsed.success || !parsed.data.url) {
    return NextResponse.json({ error: "A valid social URL is required." }, { status: 400 });
  }

  const parsedUrl = parseSocialUrl(parsed.data.url);
  const link = await createArtistSocialLink({
    artist_id: artistId,
    url: parsed.data.url,
    platform: cleanOptionalText(parsed.data.platform) || parsedUrl.platform,
    handle: cleanOptionalText(parsed.data.handle) ?? parsedUrl.handle,
    label: cleanOptionalText(parsed.data.label),
  });

  return NextResponse.json(link);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  const { artistId } = await params;
  const access = await requireEditableArtist(request, artistId);
  if (access.response) return access.response;

  try {
    await enforceSocialRateLimit(access.session.user.id, artistId);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = socialSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Social link id is required." }, { status: 400 });
  }

  const currentLink = await getOwnedSocialLink(artistId, parsed.data.id);
  if (!currentLink) {
    return NextResponse.json({ error: "Social link not found." }, { status: 404 });
  }

  const updates: Partial<
    Pick<ArtistSocialLink, "url" | "platform" | "handle" | "label" | "sort_order">
  > = {};

  if (parsed.data.url) {
    const parsedUrl = parseSocialUrl(parsed.data.url);
    updates.url = parsed.data.url;
    updates.platform = cleanOptionalText(parsed.data.platform) || parsedUrl.platform;
    updates.handle = cleanOptionalText(parsed.data.handle) ?? parsedUrl.handle;
  } else {
    if (parsed.data.platform !== undefined) {
      updates.platform = cleanOptionalText(parsed.data.platform) || currentLink.platform;
    }
    if (parsed.data.handle !== undefined) {
      updates.handle = cleanOptionalText(parsed.data.handle);
    }
  }

  if (parsed.data.label !== undefined) {
    updates.label = cleanOptionalText(parsed.data.label);
  }
  if (parsed.data.sort_order !== undefined) {
    updates.sort_order = parsed.data.sort_order;
  }

  const link = await updateArtistSocialLink(parsed.data.id, updates);
  return NextResponse.json(link);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  const { artistId } = await params;
  const access = await requireEditableArtist(request, artistId);
  if (access.response) return access.response;

  try {
    await enforceSocialRateLimit(access.session.user.id, artistId);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Social link id is required." }, { status: 400 });
  }

  const currentLink = await getOwnedSocialLink(artistId, id);
  if (!currentLink) {
    return NextResponse.json({ error: "Social link not found." }, { status: 404 });
  }

  await deleteArtistSocialLink(id);
  return NextResponse.json({ success: true });
}
