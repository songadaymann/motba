import { NextRequest, NextResponse } from "next/server";
import {
  applySessionCookie,
  consumeEmailToken,
  createSession,
  getOrCreateUser,
} from "@/lib/auth";
import { markSubmissionEmailVerified } from "@/lib/submissions";

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");

  if (!rawToken) {
    return NextResponse.redirect(new URL("/sign-in?error=missing-token", request.url));
  }

  const token = await consumeEmailToken(rawToken);
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in?error=expired-token", request.url));
  }

  const user = await getOrCreateUser({
    email: token.email,
    name: token.name,
  });

  if (token.purpose === "submission_verification" && token.submission_id) {
    await markSubmissionEmailVerified({
      submissionId: token.submission_id,
      userId: user.id,
    });
  }

  const session = await createSession(user.id);
  const destination =
    token.next_path ||
    (token.purpose === "submission_verification" && token.submission_id
      ? `/submissions/${token.submission_id}`
      : "/account");

  const response = NextResponse.redirect(new URL(destination, request.url));
  applySessionCookie(response, session, request.nextUrl.protocol === "https:");
  return response;
}
