import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import { createPasskeyRegistrationOptions } from "@/lib/passkeys";
import {
  enforceRateLimit,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookieValue(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enforceRateLimit({
      action: "passkey-register-options-user",
      identifier: session.user.id,
      limit: 20,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const options = await createPasskeyRegistrationOptions(session.user, request);
  return NextResponse.json(options);
}
