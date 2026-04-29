import { NextRequest, NextResponse } from "next/server";
import {
  createArtworkImages,
  deleteArtworkImage,
  listArtworkImages,
  updateArtworkImage,
} from "@/lib/d1";
import { handleAdminRouteError, requireAdmin } from "@/lib/admin-route";

// GET /api/admin/artwork-images?artwork_id=xxx
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

    return NextResponse.json(await listArtworkImages(artworkId));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// POST /api/admin/artwork-images — batch create
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const {
      artwork_id,
      images,
    }: {
      artwork_id: string;
      images: {
        cloudinary_public_id: string;
        width?: number;
        height?: number;
        caption?: string;
        alt_text?: string;
      }[];
    } = body;

    if (!artwork_id || !images?.length) {
      return NextResponse.json(
        { error: "artwork_id and images are required" },
        { status: 400 }
      );
    }

    return NextResponse.json(await createArtworkImages(artwork_id, images));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// PATCH /api/admin/artwork-images — update single image
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    return NextResponse.json(await updateArtworkImage(id, updates));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// DELETE /api/admin/artwork-images?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteArtworkImage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
