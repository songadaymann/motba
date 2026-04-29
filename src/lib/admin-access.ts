import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";

type AdminIdentity = {
  email: string;
};

export class AdminAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

function isLocalAdminEnabled(env: CloudflareEnv): boolean {
  return (
    env.ALLOW_LOCAL_ADMIN === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

function getAllowedEmails(env: CloudflareEnv): string[] {
  return (env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getCookieValue(requestHeaders: Headers, name: string): string | null {
  const cookieHeader = requestHeaders.get("cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");
    if (cookieName !== name) continue;

    const value = valueParts.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

function normalizeIssuer(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

function getIssuerCandidate(token: string, env: CloudflareEnv): string {
  if (env.ACCESS_TEAM_DOMAIN) {
    return normalizeIssuer(env.ACCESS_TEAM_DOMAIN);
  }

  const decoded = decodeJwt(token);
  if (typeof decoded.iss !== "string" || !decoded.iss) {
    throw new AdminAccessError(401, "Missing Access issuer");
  }

  const issuer = normalizeIssuer(decoded.iss);
  if (!issuer.endsWith(".cloudflareaccess.com")) {
    throw new AdminAccessError(401, "Invalid Access issuer");
  }

  return issuer;
}

function getAuthenticatedEmail(payload: Record<string, unknown>, requestHeaders: Headers): string {
  const payloadEmail = typeof payload.email === "string" ? payload.email : null;
  const headerEmail = requestHeaders.get("cf-access-authenticated-user-email");
  const email = payloadEmail ?? headerEmail;

  if (!email) {
    throw new AdminAccessError(403, "Missing Access email");
  }

  if (payloadEmail && headerEmail && payloadEmail.toLowerCase() !== headerEmail.toLowerCase()) {
    throw new AdminAccessError(403, "Access email mismatch");
  }

  return email.toLowerCase();
}

export async function assertAdminAccess(
  requestHeaders: Headers
): Promise<AdminIdentity> {
  const env = await getEnv();
  const allowedEmails = getAllowedEmails(env);

  if (isLocalAdminEnabled(env)) {
    const fallbackEmail = allowedEmails[0] || "local-dev@localhost";
    return { email: fallbackEmail };
  }

  if (allowedEmails.length === 0) {
    throw new AdminAccessError(403, "Missing ADMIN_EMAILS allowlist");
  }

  const session = await getSessionFromCookieValue(
    getCookieValue(requestHeaders, SESSION_COOKIE)
  );
  if (session) {
    const email = session.user.email.toLowerCase();
    if (!allowedEmails.includes(email)) {
      throw new AdminAccessError(403, "Admin email not allowed");
    }
    return { email };
  }

  const token = requestHeaders.get("cf-access-jwt-assertion");
  if (!env.ACCESS_AUD || !token) {
    throw new AdminAccessError(401, "Sign in required");
  }

  const issuer = getIssuerCandidate(token, env);
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, jwks, {
      issuer,
      audience: env.ACCESS_AUD,
    });
    payload = verified.payload;
  } catch {
    throw new AdminAccessError(401, "Invalid Access JWT");
  }

  const email = getAuthenticatedEmail(payload, requestHeaders);
  if (!allowedEmails.includes(email)) {
    throw new AdminAccessError(403, "Admin email not allowed");
  }

  return { email };
}

export async function assertAdminPageAccess() {
  try {
    await assertAdminAccess(await headers());
  } catch (error) {
    if (error instanceof AdminAccessError) {
      if (error.status === 401) redirect("/sign-in?next=/admin");
      forbidden();
    }
    throw error;
  }
}
