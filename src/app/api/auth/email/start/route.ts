import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildEmailLayout, sendEmail } from "@/lib/email";
import { createEmailToken, safeNextPath } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional(),
  nextPath: z.string().optional(),
  turnstileToken: z.string().max(2048).optional(),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await enforceRateLimit({
      action: "auth-email-ip",
      identifier: getClientIp(request),
      limit: 10,
      windowSeconds: 60 * 60,
    });
    await enforceRateLimit({
      action: "auth-email-address",
      identifier: parsed.data.email,
      limit: 4,
      windowSeconds: 15 * 60,
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

  const { rawToken } = await createEmailToken({
    email: parsed.data.email,
    name: parsed.data.name,
    purpose: "login",
    nextPath: safeNextPath(parsed.data.nextPath) ?? "/account",
    expiresInMinutes: 30,
  });

  const verifyUrl = new URL("/auth/verify", request.nextUrl.origin);
  verifyUrl.searchParams.set("token", rawToken);
  verifyUrl.searchParams.set("purpose", "login");

  await sendEmail({
    to: parsed.data.email,
    subject: "Sign in to MOTBA",
    text: `Use this link to sign in to MOTBA. It expires in 30 minutes:\n\n${verifyUrl.toString()}`,
    html: buildEmailLayout(
      "Sign in to MOTBA",
      `<p>Use this private link to sign in as ${escapeHtml(parsed.data.email)}. It expires in 30 minutes.</p>`,
      { label: "Sign in", href: verifyUrl.toString() }
    ),
  });

  return NextResponse.json({ ok: true });
}
