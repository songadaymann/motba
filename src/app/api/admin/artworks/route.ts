import { NextRequest, NextResponse } from "next/server";
import {
  createArtwork,
  deleteArtwork,
  updateArtwork,
} from "@/lib/d1";
import { handleAdminRouteError, requireAdmin } from "@/lib/admin-route";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const artistId = body.artist_id;
    const title = body.title?.trim();

    if (!artistId || !title) {
      return NextResponse.json(
        { error: "artist_id and title are required" },
        { status: 400 }
      );
    }

    const artwork = await createArtwork(artistId, title);
    return NextResponse.json(artwork);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const artwork = await updateArtwork(id, updates);
    return NextResponse.json(artwork);
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

    await deleteArtwork(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
