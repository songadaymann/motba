import "server-only";

import {
  all,
  first,
  fromSqlBoolean,
  nowIso,
  run,
  toSqlBoolean,
} from "@/lib/d1-utils";
import { hashToken, randomToken } from "@/lib/auth";
import type { ArtCategory, Submission, SubmissionStatus } from "@/types/database";

type SubmissionRow = Omit<Submission, "is_ongoing" | "gallery_image_ids"> & {
  is_ongoing: number | boolean;
  gallery_image_ids: string;
};

export type PublicSubmissionInput = {
  submitterName: string;
  submitterEmail: string;
  submitterRelationship?: string | null;
  artistName: string;
  artistWebsite?: string | null;
  artworkTitle: string;
  category: ArtCategory;
  yearsDisplay?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  isOngoing?: boolean;
  description?: string | null;
  externalUrl?: string | null;
};

function mapSubmissionRow(row: SubmissionRow): Submission {
  return {
    ...row,
    is_ongoing: fromSqlBoolean(row.is_ongoing),
    gallery_image_ids: JSON.parse(row.gallery_image_ids || "[]") as string[],
  };
}

export async function createPublicSubmission(input: PublicSubmissionInput) {
  const id = crypto.randomUUID();
  const privateToken = randomToken();
  const privateTokenHash = await hashToken(privateToken);
  const timestamp = nowIso();

  await run(
    `INSERT INTO submissions (
       id,
       submitter_name,
       submitter_email,
       submitter_relationship,
       artist_name,
       artist_website,
       artwork_title,
       category,
       years_display,
       start_year,
       end_year,
       is_ongoing,
       description,
       external_url,
       gallery_image_ids,
       status,
       private_token_hash,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.submitterName.trim(),
      input.submitterEmail.trim().toLowerCase(),
      input.submitterRelationship?.trim() || null,
      input.artistName.trim(),
      input.artistWebsite?.trim() || null,
      input.artworkTitle.trim(),
      input.category,
      input.yearsDisplay?.trim() || null,
      input.startYear ?? null,
      input.endYear ?? null,
      toSqlBoolean(Boolean(input.isOngoing)),
      input.description?.trim() || null,
      input.externalUrl?.trim() || null,
      "[]",
      "pending" satisfies SubmissionStatus,
      privateTokenHash,
      timestamp,
      timestamp,
    ]
  );

  const submission = await getSubmissionById(id);
  if (!submission) throw new Error("Failed to create submission");

  return { submission, privateToken };
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const row = await first<SubmissionRow>("SELECT * FROM submissions WHERE id = ?", [id]);
  return row ? mapSubmissionRow(row) : null;
}

export async function getSubmissionByPrivateToken(
  id: string,
  token: string
): Promise<Submission | null> {
  const tokenHash = await hashToken(token);
  const row = await first<SubmissionRow>(
    "SELECT * FROM submissions WHERE id = ? AND private_token_hash = ?",
    [id, tokenHash]
  );
  return row ? mapSubmissionRow(row) : null;
}

export async function getSubmissionForUser(
  id: string,
  userId: string
): Promise<Submission | null> {
  const row = await first<SubmissionRow>(
    "SELECT * FROM submissions WHERE id = ? AND submitter_user_id = ?",
    [id, userId]
  );
  return row ? mapSubmissionRow(row) : null;
}

export async function markSubmissionEmailVerified(input: {
  submissionId: string;
  userId: string;
}) {
  await run(
    `UPDATE submissions
     SET submitter_user_id = ?,
         email_verified_at = COALESCE(email_verified_at, ?)
     WHERE id = ?`,
    [input.userId, nowIso(), input.submissionId]
  );
}

export async function markSubmissionVerificationSent(submissionId: string) {
  await run("UPDATE submissions SET verification_sent_at = ? WHERE id = ?", [
    nowIso(),
    submissionId,
  ]);
}

export async function listSubmissionsForUser(userId: string): Promise<Submission[]> {
  const rows = await all<SubmissionRow>(
    `SELECT *
     FROM submissions
     WHERE submitter_user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(mapSubmissionRow);
}
