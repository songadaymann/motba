import "server-only";

import { first, nowIso, run } from "@/lib/d1-utils";

type RateLimitRow = {
  count: number;
  reset_at: string;
};

type RateLimitInput = {
  action: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many attempts. Try again later.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getIpFromHeaders(headers: Headers) {
  const cfIp = headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return "unknown";
}

export function getClientIp(request: Request) {
  return getIpFromHeaders(request.headers);
}

async function hashRateLimitKey(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function checkRateLimit({
  action,
  identifier,
  limit,
  windowSeconds,
}: RateLimitInput): Promise<RateLimitResult> {
  const normalizedIdentifier = identifier.trim().toLowerCase() || "unknown";
  const key = await hashRateLimitKey(`${action}:${normalizedIdentifier}`);
  const now = Date.now();
  const resetAt = new Date(now + windowSeconds * 1000).toISOString();
  const row = await first<RateLimitRow>(
    "SELECT count, reset_at FROM rate_limits WHERE key = ? LIMIT 1",
    [key]
  );

  if (!row || Date.parse(row.reset_at) <= now) {
    await run(
      `INSERT INTO rate_limits (key, action, count, reset_at, updated_at)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         action = excluded.action,
         count = 1,
         reset_at = excluded.reset_at,
         updated_at = excluded.updated_at`,
      [key, action, resetAt, nowIso()]
    );
    return { ok: true, retryAfterSeconds: 0, remaining: Math.max(0, limit - 1) };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((Date.parse(row.reset_at) - now) / 1000)
  );

  if (row.count >= limit) {
    return { ok: false, retryAfterSeconds, remaining: 0 };
  }

  await run(
    "UPDATE rate_limits SET count = count + 1, updated_at = ? WHERE key = ?",
    [nowIso(), key]
  );

  return {
    ok: true,
    retryAfterSeconds,
    remaining: Math.max(0, limit - row.count - 1),
  };
}

export async function enforceRateLimit(input: RateLimitInput) {
  const result = await checkRateLimit(input);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
  return result;
}

export function rateLimitResponse(error: RateLimitError) {
  return Response.json(
    { error: "Too many attempts. Try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(error.retryAfterSeconds),
      },
    }
  );
}
