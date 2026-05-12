import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGuestbookEntry } from "@/lib/guestbook";
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(1200),
  homepageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  website: z.string().optional(),
  turnstileToken: z.string().max(2048).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please add your name and a message." },
      { status: 400 }
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const clientIp = getClientIp(request);

  try {
    await enforceRateLimit({
      action: "guestbook-ip",
      identifier: clientIp,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    await enforceRateLimit({
      action: "guestbook-message",
      identifier: parsed.data.message,
      limit: 2,
      windowSeconds: 24 * 60 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, request))) {
    return NextResponse.json(
      { error: "Please verify that you are human." },
      { status: 400 }
    );
  }

  const entry = await createGuestbookEntry({
    name: parsed.data.name,
    message: parsed.data.message,
    homepageUrl: parsed.data.homepageUrl || null,
    clientIp,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, entry }, { status: 201 });
}
