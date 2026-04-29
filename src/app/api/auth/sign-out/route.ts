import { NextRequest, NextResponse } from "next/server";
import {
  applyClearSessionCookie,
  deleteSession,
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookieValue(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (session) {
    await deleteSession(session.sessionId);
  }

  const response = NextResponse.json({ ok: true });
  applyClearSessionCookie(response, request.nextUrl.protocol === "https:");
  return response;
}
