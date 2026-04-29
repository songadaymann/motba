import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildEmailLayout, sendEmail } from "@/lib/email";
import { createEmailToken } from "@/lib/auth";
import {
  createPublicSubmission,
  markSubmissionVerificationSent,
} from "@/lib/submissions";

const currentYear = new Date().getFullYear();

const schema = z.object({
  submitterName: z.string().trim().min(1).max(160),
  submitterEmail: z.string().trim().email().max(240),
  submitterRelationship: z.string().trim().max(160).optional(),
  artistName: z.string().trim().min(1).max(200),
  artistWebsite: z.string().trim().url().max(500).optional().or(z.literal("")),
  artworkTitle: z.string().trim().min(1).max(240),
  category: z.enum(["music", "art", "writing", "performance", "photography"]),
  yearsDisplay: z.string().trim().max(120).optional(),
  startYear: z.coerce.number().int().min(1).max(currentYear + 100).optional().or(z.literal("")),
  endYear: z.coerce.number().int().min(1).max(currentYear + 100).optional().or(z.literal("")),
  isOngoing: z.boolean().optional(),
  description: z.string().trim().max(4000).optional(),
  externalUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  website: z.string().optional(),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function numberOrNull(value: number | "") {
  return typeof value === "number" ? value : null;
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the required fields and URLs." },
      { status: 400 }
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const { submission, privateToken } = await createPublicSubmission({
    submitterName: parsed.data.submitterName,
    submitterEmail: parsed.data.submitterEmail,
    submitterRelationship: parsed.data.submitterRelationship,
    artistName: parsed.data.artistName,
    artistWebsite: parsed.data.artistWebsite || null,
    artworkTitle: parsed.data.artworkTitle,
    category: parsed.data.category,
    yearsDisplay: parsed.data.yearsDisplay,
    startYear: numberOrNull(parsed.data.startYear ?? ""),
    endYear: numberOrNull(parsed.data.endYear ?? ""),
    isOngoing: parsed.data.isOngoing,
    description: parsed.data.description,
    externalUrl: parsed.data.externalUrl || null,
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
