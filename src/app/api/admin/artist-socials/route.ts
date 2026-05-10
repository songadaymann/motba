import { NextRequest, NextResponse } from "next/server";
import {
  createArtistSocialLink,
  deleteArtistSocialLink,
  listArtistSocialLinks,
  updateArtistSocialLink,
} from "@/lib/d1";
import { handleAdminRouteError, requireAdmin } from "@/lib/admin-route";
import { parseSocialUrl } from "@/lib/social-links";
import type { ArtistSocialLink } from "@/types/database";

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const artistId = request.nextUrl.searchParams.get("artist_id");
    if (!artistId) {
      return NextResponse.json(
        { error: "artist_id is required" },
        { status: 400 }
      );
    }

    return NextResponse.json(await listArtistSocialLinks(artistId));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const artistId = cleanText(body.artist_id);
    const url = cleanText(body.url);

    if (!artistId || !url) {
      return NextResponse.json(
        { error: "artist_id and url are required" },
        { status: 400 }
      );
    }

    const parsed = parseSocialUrl(url);
    return NextResponse.json(
      await createArtistSocialLink({
        artist_id: artistId,
        url,
        platform: cleanText(body.platform) || parsed.platform,
        handle: cleanText(body.handle) ?? parsed.handle,
        label: cleanText(body.label),
      })
    );
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const id = cleanText(body.id);
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const patchData: Record<string, unknown> = {};
    const url = cleanText(body.url);
    if (url) {
      const parsed = parseSocialUrl(url);
      patchData.url = url;
      patchData.platform = cleanText(body.platform) || parsed.platform;
      patchData.handle = cleanText(body.handle) ?? parsed.handle;
    } else {
      if (body.platform !== undefined) patchData.platform = cleanText(body.platform);
      if (body.handle !== undefined) patchData.handle = cleanText(body.handle);
    }
    if (body.label !== undefined) patchData.label = cleanText(body.label);
    if (body.sort_order !== undefined) patchData.sort_order = body.sort_order;

    return NextResponse.json(
      await updateArtistSocialLink(
        id,
        patchData as Partial<
          Pick<ArtistSocialLink, "url" | "platform" | "handle" | "label" | "sort_order">
        >
      )
    );
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteArtistSocialLink(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
