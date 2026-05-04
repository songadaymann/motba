export const RESERVED_USERNAMES = new Set([
  "account",
  "admin",
  "api",
  "artists",
  "artworks",
  "auth",
  "fullscreen-timeline",
  "sign-in",
  "start",
  "submissions",
  "submit",
  "timeline",
  "_next",
]);

export function slugifyProjectSegment(value: string, fallback = "project") {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");

  return slug || fallback;
}

export function normalizeUsername(value: string) {
  return slugifyProjectSegment(value, "user");
}

export function isReservedUsername(value: string) {
  return RESERVED_USERNAMES.has(normalizeUsername(value));
}

export function suggestUsername(input: { username?: string | null; name?: string | null; email: string }) {
  if (input.username) return normalizeUsername(input.username);
  const source = input.name?.trim() || input.email.split("@")[0] || "user";
  return normalizeUsername(source);
}
