import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applySessionCookie, createSession } from "@/lib/auth";
import { verifyPasskeyAuthentication } from "@/lib/passkeys";
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";

const schema = z.object({
  challenge: z.string().min(1),
  credential: z.unknown(),
});

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit({
      action: "passkey-auth-verify-ip",
      identifier: getClientIp(request),
      limit: 60,
      windowSeconds: 10 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid passkey response" }, { status: 400 });
  }

  try {
    const user = await verifyPasskeyAuthentication({
      challenge: parsed.data.challenge,
      credential: parsed.data.credential as never,
    });
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    applySessionCookie(response, session, request.nextUrl.protocol === "https:");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Passkey sign-in failed" },
      { status: 400 }
    );
  }
}
