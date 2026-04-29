import { NextRequest, NextResponse } from "next/server";
import {
  createArtworkLink,
  deleteArtworkLink,
  listArtworkLinks,
  updateArtworkLink,
} from "@/lib/d1";
import { handleAdminRouteError, requireAdmin } from "@/lib/admin-route";

// ── URL parsing helpers ──────────────────────────────────────────────

interface ParsedLink {
  platform: string | null;
  embed_id: string | null;
  link_type: "video" | "article" | "website" | "social";
}

function parseUrl(url: string): ParsedLink {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // YouTube
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      let videoId: string | null = null;
      if (host === "youtu.be") {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get("v");
        // Handle /embed/ and /shorts/ URLs
        if (!videoId) {
          const embedMatch = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
          if (embedMatch) videoId = embedMatch[2];
        }
      }
      if (videoId) {
        return { platform: "youtube", embed_id: videoId, link_type: "video" };
      }
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = u.pathname.match(/\/(?:video\/)?(\d+)/);
      if (match) {
        return { platform: "vimeo", embed_id: match[1], link_type: "video" };
      }
    }

    // Article platforms
    if (
      host.includes("substack.com") ||
      host.includes("medium.com") ||
      host.includes("wordpress.com") ||
      host.includes("blogspot.com") ||
      host.includes("ghost.io")
    ) {
      return { platform: host.split(".")[0], embed_id: null, link_type: "article" };
    }

    // Wikipedia
    if (host.includes("wikipedia.org")) {
      return { platform: "wikipedia", embed_id: null, link_type: "article" };
    }

    // Social platforms
    if (
      host === "twitter.com" ||
      host === "x.com" ||
      host === "instagram.com" ||
      host === "facebook.com" ||
      host === "threads.net" ||
      host === "bsky.app"
    ) {
      return { platform: host.replace(".com", "").replace(".app", ""), embed_id: null, link_type: "social" };
    }

    return { platform: null, embed_id: null, link_type: "website" };
  } catch {
    return { platform: null, embed_id: null, link_type: "website" };
  }
}

// ── GET /api/admin/artwork-links?artwork_id=xxx ──────────────────────

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const artworkId = request.nextUrl.searchParams.get("artwork_id");
    if (!artworkId) {
      return NextResponse.json(
        { error: "artwork_id is required" },
        { status: 400 }
      );
    }

    return NextResponse.json(await listArtworkLinks(artworkId));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// ── POST /api/admin/artwork-links ────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { artwork_id, url, title, description } = body;

    if (!artwork_id || !url || !title) {
      return NextResponse.json(
        { error: "artwork_id, url, and title are required" },
        { status: 400 }
      );
    }

    const parsed = parseUrl(url);
    return NextResponse.json(
      await createArtworkLink({
        artwork_id,
        url,
        title,
        description: description || null,
        link_type: parsed.link_type,
        platform: parsed.platform,
        embed_id: parsed.embed_id,
      })
    );
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// ── PATCH /api/admin/artwork-links ───────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { id, url, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const patchData: Record<string, unknown> = { ...updates };
    if (url) {
      const parsed = parseUrl(url);
      patchData.url = url;
      patchData.platform = parsed.platform;
      patchData.embed_id = parsed.embed_id;
      patchData.link_type = parsed.link_type;
    }

    return NextResponse.json(await updateArtworkLink(id, patchData));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// ── DELETE /api/admin/artwork-links?id=xxx ───────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteArtworkLink(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
