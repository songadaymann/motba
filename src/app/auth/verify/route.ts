import { NextRequest, NextResponse } from "next/server";
import {
  applySessionCookie,
  consumeEmailToken,
  createSession,
  getOrCreateUser,
  type EmailTokenPurpose,
} from "@/lib/auth";
import { markSubmissionEmailVerified } from "@/lib/submissions";

const VERIFY_PURPOSES: EmailTokenPurpose[] = ["login", "submission_verification"];

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  const purposeParam = request.nextUrl.searchParams.get("purpose");

  if (!rawToken) {
    return NextResponse.redirect(new URL("/sign-in?error=missing-token", request.url));
  }

  const purpose = VERIFY_PURPOSES.find((item) => item === purposeParam);
  if (purposeParam && !purpose) {
    return NextResponse.redirect(new URL("/sign-in?error=expired-token", request.url));
  }

  const token = await consumeEmailToken(rawToken, purpose ?? VERIFY_PURPOSES);
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
