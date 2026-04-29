import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import { deletePasskeyForUser } from "@/lib/passkeys";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookieValue(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const passkeys = await deletePasskeyForUser({ id, userId: session.user.id });
  return NextResponse.json({ ok: true, passkeys });
}
