import { NextRequest, NextResponse } from "next/server";
import { createPasskeyAuthenticationOptions } from "@/lib/passkeys";
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit({
      action: "passkey-auth-options-ip",
      identifier: getClientIp(request),
      limit: 60,
      windowSeconds: 10 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const options = await createPasskeyAuthenticationOptions(request);
  return NextResponse.json(options);
}
