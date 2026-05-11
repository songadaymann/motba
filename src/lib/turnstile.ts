import "server-only";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerificationResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
}

export function isTurnstileRequired() {
  return (
    process.env.TURNSTILE_REQUIRED === "true" ||
    process.env.NEXTJS_ENV === "production"
  );
}

export function isTurnstileEnabled() {
  return Boolean(
    getTurnstileSiteKey() ||
      process.env.TURNSTILE_SECRET_KEY ||
      isTurnstileRequired()
  );
}

export async function verifyTurnstileToken(
  token: unknown,
  request: Request
): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return false;
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);

  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) body.append("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body,
  });

  if (!response.ok) return false;

  const result = (await response.json().catch(() => null)) as
    | TurnstileVerificationResponse
    | null;
  return result?.success === true;
}
