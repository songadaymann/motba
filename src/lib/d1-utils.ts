import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type SqlValue = string | number | null;

export async function getDb(): Promise<CloudflareEnv["DB"]> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export async function all<T>(
  sql: string,
  bindings: SqlValue[] = []
): Promise<T[]> {
  const db = await getDb();
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results;
}

export async function first<T>(
  sql: string,
  bindings: SqlValue[] = []
): Promise<T | null> {
  const db = await getDb();
  return db.prepare(sql).bind(...bindings).first<T>();
}

export async function run(sql: string, bindings: SqlValue[] = []) {
  const db = await getDb();
  return db.prepare(sql).bind(...bindings).run();
}

export async function batch(statements: Array<{ sql: string; bindings?: SqlValue[] }>) {
  const db = await getDb();
  return db.batch(
    statements.map(({ sql, bindings = [] }) => db.prepare(sql).bind(...bindings))
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

export function toSqlBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export function fromSqlBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}
