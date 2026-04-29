import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentSession } from "@/lib/auth";
import {
  getSubmissionByPrivateToken,
  getSubmissionForUser,
} from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function SubmissionStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ id }, { key }, session] = await Promise.all([
    params,
    searchParams,
    getCurrentSession(),
  ]);

  const submission = key
    ? await getSubmissionByPrivateToken(id, key)
    : session
      ? await getSubmissionForUser(id, session.user.id)
      : null;

  if (!submission) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{submission.artist_name}</h1>
        <Badge variant="outline">{submission.status}</Badge>
      </div>

      <div className="mt-8 grid gap-6">
        <section className="border border-border p-5">
          <h2 className="text-xl font-bold">{submission.artwork_title}</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.1em] text-muted-foreground">
            {submission.category}
          </p>
          {submission.years_display && (
            <p className="mt-3 text-muted-foreground">{submission.years_display}</p>
          )}
          {submission.description && <p className="mt-4">{submission.description}</p>}
          {submission.external_url && (
            <Link
              href={submission.external_url}
              className="mt-4 inline-block underline underline-offset-4"
            >
              Primary link
            </Link>
          )}
        </section>

        <section className="grid gap-2 text-sm text-muted-foreground">
          <p>
            Email verification:{" "}
            {submission.email_verified_at ? "verified" : "not verified"}
          </p>
          <p>Submitted by {submission.submitter_name}</p>
          <p>Submitted {new Date(submission.created_at).toLocaleDateString()}</p>
        </section>
      </div>
    </div>
  );
}
