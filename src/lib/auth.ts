import "server-only";

import { cookies } from "next/headers";
import { addDays, addMinutes, first, nowIso, run } from "@/lib/d1-utils";
import type { User } from "@/types/database";

export const SESSION_COOKIE = "motba_session";

const SESSION_DAYS = 90;

export type EmailTokenPurpose =
  | "login"
  | "submission_verification"
  | "claim_invite";

type UserSessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  expires_at: string;
};

type EmailTokenRow = {
  id: string;
  email: string;
  name: string | null;
  purpose: EmailTokenPurpose;
  submission_id: string | null;
  artist_id: string | null;
  next_path: string | null;
  expires_at: string;
  consumed_at: string | null;
};

export type ConsumedEmailToken = EmailTokenRow;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes as Uint8Array<ArrayBuffer>;
}

export function randomToken(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64UrlEncode(value);
}

export async function hashToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return base64UrlEncode(new Uint8Array(digest));
}

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const parsed = new URL(value, "https://motba.art");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export async function getOrCreateUser(input: {
  email: string;
  name?: string | null;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || null;
  const existing = await first<User>("SELECT * FROM users WHERE email = ?", [email]);

  if (existing) {
    if (name && !existing.name) {
      await run("UPDATE users SET name = ? WHERE id = ?", [name, existing.id]);
      return { ...existing, name };
    }
    return existing;
  }

  const id = crypto.randomUUID();
  const timestamp = nowIso();
  await run(
    `INSERT INTO users (id, email, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, email, name, timestamp, timestamp]
  );

  const user = await first<User>("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function createEmailToken(input: {
  email: string;
  name?: string | null;
  purpose: EmailTokenPurpose;
  submissionId?: string | null;
  artistId?: string | null;
  nextPath?: string | null;
  expiresInMinutes?: number;
}) {
  const rawToken = randomToken();
  const tokenHash = await hashToken(rawToken);
  const id = crypto.randomUUID();
  const expiresAt = addMinutes(input.expiresInMinutes ?? 30);

  await run(
    `INSERT INTO email_tokens (
       id,
       email,
       name,
       purpose,
       token_hash,
       submission_id,
       artist_id,
       next_path,
       expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      normalizeEmail(input.email),
      input.name?.trim() || null,
      input.purpose,
      tokenHash,
      input.submissionId ?? null,
      input.artistId ?? null,
      safeNextPath(input.nextPath) ?? null,
      expiresAt,
    ]
  );

  return { rawToken, expiresAt };
}

export async function consumeEmailToken(
  rawToken: string,
  purpose?: EmailTokenPurpose
): Promise<ConsumedEmailToken | null> {
  const tokenHash = await hashToken(rawToken);
  const row = await first<EmailTokenRow>(
    `SELECT *
     FROM email_tokens
     WHERE token_hash = ?
       AND consumed_at IS NULL
       AND expires_at > ?
       ${purpose ? "AND purpose = ?" : ""}
     LIMIT 1`,
    purpose ? [tokenHash, nowIso(), purpose] : [tokenHash, nowIso()]
  );

  if (!row) return null;

  await run("UPDATE email_tokens SET consumed_at = ? WHERE id = ?", [
    nowIso(),
    row.id,
  ]);

  return row;
}

export async function createSession(userId: string) {
  const rawToken = randomToken();
  const tokenHash = await hashToken(rawToken);
  const id = crypto.randomUUID();
  const expiresAt = addDays(SESSION_DAYS);
  const timestamp = nowIso();

  await run(
    `INSERT INTO user_sessions (
       id,
       user_id,
       token_hash,
       created_at,
       expires_at,
       last_seen_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, tokenHash, timestamp, expiresAt, timestamp]
  );
  await run("UPDATE users SET last_login_at = ? WHERE id = ?", [timestamp, userId]);

  return {
    cookieValue: `${id}.${rawToken}`,
    expiresAt,
  };
}

export function applySessionCookie(
  response: Response,
  session: { cookieValue: string; expiresAt: string },
  secure = true
) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${session.cookieValue}; Path=/; HttpOnly; SameSite=Lax; ${
      secure ? "Secure; " : ""
    }Expires=${new Date(
      session.expiresAt
    ).toUTCString()}`
  );
}

export function applyClearSessionCookie(response: Response, secure = true) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; ${
      secure ? "Secure; " : ""
    }Max-Age=0`
  );
}

export async function getCurrentSession(): Promise<{
  sessionId: string;
  expiresAt: string;
  user: User;
} | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionFromCookieValue(cookieValue);
}

export async function getSessionFromCookieValue(cookieValue?: string | null) {
  if (!cookieValue) return null;
  const [sessionId, rawToken] = cookieValue.split(".");
  if (!sessionId || !rawToken) return null;

  const tokenHash = await hashToken(rawToken);
  const row = await first<UserSessionRow>(
    `SELECT
       s.id AS session_id,
       s.expires_at,
       u.id AS user_id,
       u.email,
       u.name,
       u.created_at,
       u.updated_at,
       u.last_login_at
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?
       AND s.token_hash = ?
       AND s.expires_at > ?
     LIMIT 1`,
    [sessionId, tokenHash, nowIso()]
  );

  if (!row) return null;

  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at,
    },
  };
}

export async function deleteSession(sessionId: string) {
  await run("DELETE FROM user_sessions WHERE id = ?", [sessionId]);
}
