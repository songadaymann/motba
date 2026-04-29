import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import { verifyPasskeyRegistration } from "@/lib/passkeys";

const schema = z.object({
  challenge: z.string().min(1),
  credential: z.unknown(),
  name: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookieValue(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid passkey response" }, { status: 400 });
  }

  try {
    const passkeys = await verifyPasskeyRegistration({
      user: session.user,
      challenge: parsed.data.challenge,
      credential: parsed.data.credential as never,
      name: parsed.data.name,
    });
    return NextResponse.json({ ok: true, passkeys });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Passkey registration failed" },
      { status: 400 }
    );
  }
}
