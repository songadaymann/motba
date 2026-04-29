import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import { createPasskeyRegistrationOptions } from "@/lib/passkeys";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookieValue(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const options = await createPasskeyRegistrationOptions(session.user, request);
  return NextResponse.json(options);
}
