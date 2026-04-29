import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentSession } from "@/lib/auth";
import { listPasskeysForUser } from "@/lib/passkeys";
import { listSubmissionsForUser } from "@/lib/submissions";
import { PasskeyPanel } from "./passkey-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in?next=/account");

  const [passkeys, submissions] = await Promise.all([
    listPasskeysForUser(session.user.id),
    listSubmissionsForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Account</h1>
      <p className="mt-2 text-muted-foreground">{session.user.email}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <section className="grid gap-4">
          <h2 className="text-xl font-bold">Passkeys</h2>
          <PasskeyPanel initialPasskeys={passkeys} />
        </section>

        <section className="grid content-start gap-4">
          <h2 className="text-xl font-bold">Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verified submissions yet.</p>
          ) : (
            <div className="grid gap-2">
              {submissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="border border-border p-3 transition-colors hover:bg-accent"
                >
                  <p className="font-medium">{submission.artist_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {submission.artwork_title} · {submission.status}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
