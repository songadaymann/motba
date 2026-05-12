import "server-only";

import { all, first, fromSqlBoolean, nowIso, run } from "@/lib/d1-utils";
import type { GuestbookEntry } from "@/types/database";

type GuestbookEntryRow = Omit<GuestbookEntry, "is_visible"> & {
  is_visible: number;
};

type CreateGuestbookEntryInput = {
  name: string;
  message: string;
  homepageUrl?: string | null;
  clientIp: string;
  userAgent?: string | null;
};

type CountRow = {
  count: number;
};

function mapGuestbookEntry(row: GuestbookEntryRow): GuestbookEntry {
  return {
    ...row,
    is_visible: fromSqlBoolean(row.is_visible),
  };
}

async function hashValue(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function listGuestbookEntries(limit = 100): Promise<GuestbookEntry[]> {
  const rows = await all<GuestbookEntryRow>(
    `SELECT
       id,
       name,
       message,
       homepage_url,
       is_visible,
       ip_hash,
       user_agent,
       created_at,
       updated_at
     FROM guestbook_entries
     WHERE is_visible = 1
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(mapGuestbookEntry);
}

export async function countGuestbookEntries(): Promise<number> {
  const row = await first<CountRow>(
    "SELECT COUNT(*) AS count FROM guestbook_entries WHERE is_visible = 1"
  );
  return row?.count ?? 0;
}

export async function createGuestbookEntry(
  input: CreateGuestbookEntryInput
): Promise<GuestbookEntry> {
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const userAgent = input.userAgent?.slice(0, 300) || null;
  const ipHash =
    input.clientIp && input.clientIp !== "unknown"
      ? await hashValue(input.clientIp)
      : null;

  await run(
    `INSERT INTO guestbook_entries (
       id,
       name,
       message,
       homepage_url,
       is_visible,
       ip_hash,
       user_agent,
       created_at,
       updated_at
     )
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.message,
      input.homepageUrl || null,
      ipHash,
      userAgent,
      createdAt,
      createdAt,
    ]
  );

  const entry = await first<GuestbookEntryRow>(
    `SELECT
       id,
       name,
       message,
       homepage_url,
       is_visible,
       ip_hash,
       user_agent,
       created_at,
       updated_at
     FROM guestbook_entries
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  if (!entry) throw new Error("Guestbook entry was not saved.");
  return mapGuestbookEntry(entry);
}
