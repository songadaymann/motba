import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { GuestbookForm } from "./guestbook-form";
import { countGuestbookEntries, listGuestbookEntries } from "@/lib/guestbook";
import { getTurnstileSiteKey, isTurnstileRequired } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Guestbook",
  description: "Sign the MOTBA guestbook.",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

function formatEntryDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export default async function GuestbookPage() {
  const [entries, totalEntries] = await Promise.all([
    listGuestbookEntries(100),
    countGuestbookEntries(),
  ]);
  const turnstileSiteKey = getTurnstileSiteKey();
  const turnstileRequired = isTurnstileRequired();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="h-fit border-4 border-white bg-[#000080] p-2 shadow-[8px_8px_0_#ff00ff]">
          <div className="border-2 border-black bg-[#c0c0c0] p-1">
            <div className="bg-[#000080] px-3 py-1 font-mono text-sm font-black uppercase text-white">
              * MOTBA_GUESTBOOK.EXE
            </div>
            <div className="grid gap-5 border-2 border-black bg-black p-4">
              <div>
                <p className="font-mono text-xs font-black uppercase text-[#00ffff]">
                  You are visitor #{String(totalEntries + 1).padStart(6, "0")}
                </p>
                <h1 className="mt-2 font-mono text-3xl font-black uppercase leading-none text-[#ffff00] sm:text-4xl">
                  Guestbook
                </h1>
                <p className="mt-3 font-mono text-sm leading-6 text-white">
                  Sign in with your name. No account needed.
                </p>
              </div>
              <GuestbookForm
                turnstileRequired={turnstileRequired}
                turnstileSiteKey={turnstileSiteKey}
              />
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col justify-between gap-2 border-b-4 border-white pb-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-black uppercase text-[#00ffff]">
                Recent signatures
              </p>
              <h2 className="font-mono text-2xl font-black uppercase text-white">
                Visitors Log
              </h2>
            </div>
            <p className="font-mono text-xs text-[var(--riso-muted)]">
              {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="border-4 border-dashed border-white p-6 font-mono text-sm text-white">
              No signatures yet.
            </div>
          ) : (
            <ol className="grid gap-4">
              {entries.map((entry, index) => (
                <li
                  key={entry.id}
                  className="border-4 border-white bg-[#111] shadow-[5px_5px_0_#00ffff]"
                >
                  <div className="flex flex-col justify-between gap-2 border-b-2 border-white bg-[#800080] px-3 py-2 font-mono text-xs font-black uppercase text-white sm:flex-row">
                    <span className="min-w-0 truncate">
                      #{String(entries.length - index).padStart(3, "0")} /{" "}
                      {entry.name}
                    </span>
                    <time dateTime={entry.created_at}>
                      {formatEntryDate(entry.created_at)}
                    </time>
                  </div>
                  <div className="grid gap-3 p-4">
                    <p className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-white">
                      {entry.message}
                    </p>
                    {entry.homepage_url && (
                      <Link
                        href={entry.homepage_url}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="inline-flex w-fit items-center gap-2 font-mono text-xs font-black uppercase text-[#ffff00] underline decoration-2 underline-offset-4 hover:text-[#00ffff]"
                      >
                        Homepage
                        <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
