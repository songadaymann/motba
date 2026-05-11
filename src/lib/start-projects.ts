import "server-only";

import { all, batch, first, fromSqlBoolean, nowIso, run } from "@/lib/d1-utils";
import {
  isReservedUsername,
  normalizeUsername,
  slugifyProjectSegment,
  suggestUsername,
} from "@/lib/project-slugs";
import {
  assertCloudinaryIdInFolder,
  isValidUploadSessionId,
  startProjectUploadFolder,
} from "@/lib/cloudinary/uploads";
import type {
  User,
  UserProjectDuration,
  UserProjectEntry,
  UserProjectPrompt,
} from "@/types/database";

export type StartProjectEntryInput = {
  id?: string | null;
  url: string;
  label?: string | null;
  createdAt?: string | null;
};

export type SaveStartProjectInput = {
  projectId?: string | null;
  username: string;
  title: string;
  duration: UserProjectDuration;
  prompt: UserProjectPrompt;
  customPractice?: string | null;
  startDate: string;
  uploadSessionId?: string | null;
  profileImageCloudinaryId?: string | null;
  heroImageCloudinaryId?: string | null;
  entries: StartProjectEntryInput[];
};

export type SavedStartProject = {
  id: string;
  username: string;
  slug: string;
  title: string;
  duration: UserProjectDuration;
  prompt: UserProjectPrompt;
  customPractice: string;
  startDate: string;
  uploadSessionId: string;
  profileImageCloudinaryId: string | null;
  heroImageCloudinaryId: string | null;
  publicPath: string;
  createdAt: string;
  updatedAt: string;
  entries: Array<{
    id: string;
    url: string;
    label: string;
    createdAt: string;
  }>;
};

type UserProjectRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  duration: UserProjectDuration;
  prompt: UserProjectPrompt;
  custom_practice: string | null;
  start_date: string;
  upload_session_id: string;
  profile_image_cloudinary_id: string | null;
  hero_image_cloudinary_id: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
};

type PublicUserProjectRow = UserProjectRow & {
  username: string;
  user_name: string | null;
  user_email: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: string | null | undefined, maxLength: number) {
  return (value ?? "").trim().slice(0, maxLength);
}

function assertProjectDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    throw new Error("Use a valid start date.");
  }
  return value;
}

function assertPublicUrl(value: string) {
  const trimmed = value.trim();
  const parsed = new URL(trimmed);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Use a public http or https link.");
  }
  return parsed.toString();
}

async function resolveUsername(input: { user: User; requestedUsername: string }) {
  let username = normalizeUsername(input.requestedUsername || suggestUsername(input.user));
  if (isReservedUsername(username)) {
    username = `${username}-${input.user.id.slice(0, 6)}`;
  }

  const conflict = await first<{ id: string }>(
    "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
    [username, input.user.id]
  );
  if (conflict) {
    throw new Error("That username is already taken.");
  }

  if (input.user.username !== username) {
    await run("UPDATE users SET username = ? WHERE id = ?", [username, input.user.id]);
  }

  return username;
}

async function resolveProjectSlug(input: {
  userId: string;
  projectId?: string | null;
  title: string;
}) {
  const baseSlug = slugifyProjectSegment(input.title, "daily-project");
  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const bindings = input.projectId
      ? [input.userId, candidate, input.projectId]
      : [input.userId, candidate];
    const conflict = await first<{ id: string }>(
      `SELECT id
       FROM user_projects
       WHERE user_id = ?
         AND slug = ?
         ${input.projectId ? "AND id <> ?" : ""}
       LIMIT 1`,
      bindings
    );
    if (!conflict) return candidate;
  }

  throw new Error("Could not create a unique project URL.");
}

function mapProject(row: UserProjectRow, username: string, entries: UserProjectEntry[]): SavedStartProject {
  return {
    id: row.id,
    username,
    slug: row.slug,
    title: row.title,
    duration: row.duration,
    prompt: row.prompt,
    customPractice: row.custom_practice ?? "",
    startDate: row.start_date,
    uploadSessionId: row.upload_session_id,
    profileImageCloudinaryId: row.profile_image_cloudinary_id,
    heroImageCloudinaryId: row.hero_image_cloudinary_id,
    publicPath: `/${username}/${row.slug}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entries: entries.map((entry) => ({
      id: entry.id,
      url: entry.url,
      label: entry.label || `Day ${entry.sort_order + 1}`,
      createdAt: entry.created_at,
    })),
  };
}

async function listProjectEntries(projectId: string) {
  return all<UserProjectEntry>(
    `SELECT *
     FROM user_project_entries
     WHERE project_id = ?
     ORDER BY sort_order ASC`,
    [projectId]
  );
}

export async function getLatestStartProjectForUser(user: User) {
  const row = await first<UserProjectRow>(
    `SELECT *
     FROM user_projects
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [user.id]
  );
  if (!row) return null;

  return mapProject(row, user.username ?? suggestUsername(user), await listProjectEntries(row.id));
}

export async function saveStartProject(user: User, input: SaveStartProjectInput) {
  const title = cleanText(input.title, 120);
  if (!title) throw new Error("Name your project before sharing it.");

  const username = await resolveUsername({ user, requestedUsername: input.username });
  const existingProject = input.projectId
    ? await first<UserProjectRow>(
        "SELECT * FROM user_projects WHERE id = ? AND user_id = ? LIMIT 1",
        [input.projectId, user.id]
      )
    : null;
  const projectId = existingProject?.id ?? crypto.randomUUID();
  const slug = await resolveProjectSlug({
    userId: user.id,
    projectId: existingProject?.id ?? null,
    title,
  });
  const timestamp = nowIso();
  const uploadSessionId =
    cleanText(input.uploadSessionId, 100) || existingProject?.upload_session_id || projectId;
  if (!isValidUploadSessionId(uploadSessionId)) {
    throw new Error("Invalid upload session.");
  }
  const startDate = assertProjectDate(input.startDate);
  const customPractice = cleanText(input.customPractice, 80) || null;
  const profileImageId = cleanText(input.profileImageCloudinaryId, 300) || null;
  const heroImageId = cleanText(input.heroImageCloudinaryId, 300) || null;
  const uploadFolder = startProjectUploadFolder(user.id, uploadSessionId);
  if (profileImageId !== existingProject?.profile_image_cloudinary_id) {
    assertCloudinaryIdInFolder(
      profileImageId,
      uploadFolder,
      "Invalid profile picture upload."
    );
  }
  if (heroImageId !== existingProject?.hero_image_cloudinary_id) {
    assertCloudinaryIdInFolder(
      heroImageId,
      uploadFolder,
      "Invalid project image upload."
    );
  }
  const entries = input.entries.slice(0, 500).map((entry, index) => ({
    id: cleanText(entry.id, 80) || crypto.randomUUID(),
    url: assertPublicUrl(entry.url),
    label: cleanText(entry.label, 80) || `Day ${index + 1}`,
    createdAt: entry.createdAt && !Number.isNaN(Date.parse(entry.createdAt))
      ? entry.createdAt
      : timestamp,
    sortOrder: index,
  }));

  await batch([
    existingProject
      ? {
          sql: `UPDATE user_projects
                SET slug = ?,
                    title = ?,
                    duration = ?,
                    prompt = ?,
                    custom_practice = ?,
                    start_date = ?,
                    upload_session_id = ?,
                    profile_image_cloudinary_id = ?,
                    hero_image_cloudinary_id = ?,
                    is_public = 1
                WHERE id = ? AND user_id = ?`,
          bindings: [
            slug,
            title,
            input.duration,
            input.prompt,
            customPractice,
            startDate,
            uploadSessionId,
            profileImageId,
            heroImageId,
            projectId,
            user.id,
          ],
        }
      : {
          sql: `INSERT INTO user_projects (
                   id,
                   user_id,
                   slug,
                   title,
                   duration,
                   prompt,
                   custom_practice,
                   start_date,
                   upload_session_id,
                   profile_image_cloudinary_id,
                   hero_image_cloudinary_id,
                   is_public,
                   created_at,
                   updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          bindings: [
            projectId,
            user.id,
            slug,
            title,
            input.duration,
            input.prompt,
            customPractice,
            startDate,
            uploadSessionId,
            profileImageId,
            heroImageId,
            timestamp,
            timestamp,
          ],
        },
    { sql: "DELETE FROM user_project_entries WHERE project_id = ?", bindings: [projectId] },
    ...entries.map((entry) => ({
      sql: `INSERT INTO user_project_entries (
              id,
              project_id,
              url,
              label,
              sort_order,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
      bindings: [
        entry.id,
        projectId,
        entry.url,
        entry.label,
        entry.sortOrder,
        entry.createdAt,
      ],
    })),
  ]);

  const saved = await first<UserProjectRow>(
    "SELECT * FROM user_projects WHERE id = ? LIMIT 1",
    [projectId]
  );
  if (!saved) throw new Error("Failed to save project.");

  return mapProject(saved, username, await listProjectEntries(projectId));
}

export async function getPublicStartProject(username: string, projectSlug: string) {
  const normalizedUsername = normalizeUsername(username);
  if (isReservedUsername(normalizedUsername)) return null;

  const row = await first<PublicUserProjectRow>(
    `SELECT
       p.*,
       u.username,
       u.name AS user_name,
       u.email AS user_email
     FROM user_projects p
     JOIN users u ON u.id = p.user_id
     WHERE u.username = ?
       AND p.slug = ?
       AND p.is_public = 1
     LIMIT 1`,
    [normalizedUsername, slugifyProjectSegment(projectSlug)]
  );
  if (!row || !fromSqlBoolean(row.is_public)) return null;

  return {
    ...mapProject(row, row.username, await listProjectEntries(row.id)),
    userName: row.user_name,
    userEmail: row.user_email,
  };
}
