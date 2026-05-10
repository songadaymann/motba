import { NextRequest, NextResponse } from "next/server";
import {
  createArtistMembership,
  deleteArtistMembership,
  getUserOptionByEmail,
  listAdminArtistMemberships,
  updateArtistMembership,
} from "@/lib/d1";
import { handleAdminRouteError, requireAdmin } from "@/lib/admin-route";
import type {
  ArtistMembershipRole,
  ArtistMembershipStatus,
} from "@/types/database";

const ROLES = new Set<ArtistMembershipRole>([
  "owner",
  "representative",
  "contributor",
]);
const STATUSES = new Set<ArtistMembershipStatus>([
  "active",
  "invited",
  "revoked",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function cleanRole(value: unknown): ArtistMembershipRole {
  const role = cleanText(value) as ArtistMembershipRole | null;
  return role && ROLES.has(role) ? role : "owner";
}

function cleanStatus(value: unknown): ArtistMembershipStatus | null {
  const status = cleanText(value) as ArtistMembershipStatus | null;
  return status && STATUSES.has(status) ? status : null;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await listAdminArtistMemberships());
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const artistId = cleanText(body.artist_id);
    const userEmail = cleanText(body.user_email);
    const role = cleanRole(body.role);

    if (!artistId || !userEmail) {
      return NextResponse.json(
        { error: "artist_id and user_email are required" },
        { status: 400 }
      );
    }

    const user = await getUserOptionByEmail(userEmail);
    if (!user) {
      return NextResponse.json(
        { error: `No signed-up user found for ${userEmail}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      await createArtistMembership({
        artist_id: artistId,
        user_id: user.id,
        role,
        invited_by_email: admin.email,
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

    return NextResponse.json(
      await updateArtistMembership(id, {
        role: body.role === undefined ? undefined : cleanRole(body.role),
        status: body.status === undefined ? undefined : cleanStatus(body.status) ?? undefined,
      })
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

    await deleteArtistMembership(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
