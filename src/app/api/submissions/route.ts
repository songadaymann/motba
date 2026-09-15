import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildEmailLayout, sendEmail } from "@/lib/email";
import { createEmailToken } from "@/lib/auth";
import {
  assertCloudinaryIdInFolder,
  isValidUploadSessionId,
  submissionUploadFolder,
} from "@/lib/cloudinary/uploads";
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
  RateLimitError,
} from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  createPublicSubmission,
  markSubmissionVerificationSent,
} from "@/lib/submissions";

const dateSchema = z.string().max(10);

const schema = z.object({
  submitterName: z.string().trim().min(1).max(160),
  submitterEmail: z.string().trim().email().max(240),
  submitterRelationship: z.string().trim().max(160).optional(),
  artistName: z.string().trim().min(1).max(200),
  artistWebsite: z.string().trim().url().max(500).optional().or(z.literal("")),
  uploadSessionId: z.string().trim().max(100).optional(),
  artistPhotoCloudinaryId: z.string().trim().max(300).optional().or(z.literal("")),
  artworkTitle: z.string().trim().min(1).max(240),
  category: z.enum(["music", "art", "writing", "performance", "photography"]),
  projectFrequency: z.enum(["daily", "yearly"]).optional(),
  startDate: dateSchema,
  endDate: dateSchema.optional().or(z.literal("")),
  isOngoing: z.boolean().optional(),
  description: z.string().trim().max(4000).optional(),
  externalUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  heroImageCloudinaryId: z.string().trim().max(300).optional().or(z.literal("")),
  website: z.string().optional(),
  turnstileToken: z.string().max(2048).optional(),
}).superRefine((value, context) => {
  const start = parseDate(value.startDate);
  const end = value.endDate ? parseDate(value.endDate) : null;

  if (!start) {
    context.addIssue({
      code: "custom",
      path: ["startDate"],
      message: "Enter a valid start date.",
    });
  }
  if (value.endDate && !end) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "Enter a valid end date.",
    });
  }
  if (!value.isOngoing && !value.endDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "Enter an end date or mark the project ongoing.",
    });
  }
  if (start && end && end.valueOf() < start.valueOf()) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must be on or after the start date.",
    });
  }
});

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues.find((issue) => issue.message)?.message;
    return NextResponse.json(
      { error: message || "Please check the required fields and URLs." },
      { status: 400 }
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    await enforceRateLimit({
      action: "submission-ip",
      identifier: getClientIp(request),
      limit: 8,
      windowSeconds: 60 * 60,
    });
    await enforceRateLimit({
      action: "submission-email",
      identifier: parsed.data.submitterEmail,
      limit: 3,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    throw error;
  }

  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, request))) {
    return NextResponse.json(
      { error: "Please verify that you are human." },
      { status: 400 }
    );
  }

  try {
    const uploadSessionId = parsed.data.uploadSessionId || "";
    const hasImages = Boolean(
      parsed.data.artistPhotoCloudinaryId || parsed.data.heroImageCloudinaryId
    );
    if (hasImages && !isValidUploadSessionId(uploadSessionId)) {
      throw new Error("Invalid upload session.");
    }
    if (hasImages) {
      const folder = submissionUploadFolder(uploadSessionId);
      assertCloudinaryIdInFolder(
        parsed.data.artistPhotoCloudinaryId || null,
        folder,
        "Invalid artist photo upload."
      );
      assertCloudinaryIdInFolder(
        parsed.data.heroImageCloudinaryId || null,
        folder,
        "Invalid project image upload."
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid upload." },
      { status: 400 }
    );
  }

  const start = dateParts(parsed.data.startDate);
  const end = parsed.data.isOngoing || !parsed.data.endDate
    ? null
    : dateParts(parsed.data.endDate);
  const yearsDisplay = parsed.data.isOngoing
    ? `${start.year} - now`
    : start.year === end?.year
      ? String(start.year)
      : `${start.year} - ${end?.year}`;

  const { submission, privateToken } = await createPublicSubmission({
    submitterName: parsed.data.submitterName,
    submitterEmail: parsed.data.submitterEmail,
    submitterRelationship: parsed.data.submitterRelationship,
    artistName: parsed.data.artistName,
    artistWebsite: parsed.data.artistWebsite || null,
    artistPhotoCloudinaryId: parsed.data.artistPhotoCloudinaryId || null,
    artworkTitle: parsed.data.artworkTitle,
    category: parsed.data.category,
    projectFrequency: parsed.data.projectFrequency ?? "daily",
    yearsDisplay,
    startYear: start.year,
    startMonth: start.month,
    startDay: start.day,
    endYear: end?.year ?? null,
    endMonth: end?.month ?? null,
    endDay: end?.day ?? null,
    isOngoing: parsed.data.isOngoing,
    description: parsed.data.description,
    externalUrl: parsed.data.externalUrl || null,
    heroImageCloudinaryId: parsed.data.heroImageCloudinaryId || null,
  });

  const statusPath = `/submissions/${submission.id}?key=${encodeURIComponent(privateToken)}`;
  const { rawToken } = await createEmailToken({
    email: parsed.data.submitterEmail,
    name: parsed.data.submitterName,
    purpose: "submission_verification",
    submissionId: submission.id,
    nextPath: statusPath,
    expiresInMinutes: 60,
  });

  const verifyUrl = new URL("/auth/verify", request.nextUrl.origin);
  verifyUrl.searchParams.set("token", rawToken);
  verifyUrl.searchParams.set("purpose", "submission_verification");

  await sendEmail({
    to: parsed.data.submitterEmail,
    subject: "Verify your MOTBA submission",
    text: `Verify your submission to MOTBA. This link expires in 60 minutes:\n\n${verifyUrl.toString()}`,
    html: buildEmailLayout(
      "Verify your MOTBA submission",
      `<p>Thanks for submitting <strong>${escapeHtml(parsed.data.artistName)}</strong> to MOTBA.</p><p>Use this private link to verify your email and add the submission to the review queue. It expires in 60 minutes.</p>`,
      { label: "Verify submission", href: verifyUrl.toString() }
    ),
  });
  await markSubmissionVerificationSent(submission.id);

  return NextResponse.json({ ok: true });
}
