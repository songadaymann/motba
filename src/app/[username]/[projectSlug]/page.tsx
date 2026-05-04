import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Link as LinkIcon } from "lucide-react";
import { MediaEmbed, getMediaEmbedInfo } from "@/components/MediaEmbed";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { SITE_CONFIG } from "@/lib/constants";
import { getPublicStartProject } from "@/lib/start-projects";

export const dynamic = "force-dynamic";

const DURATION_LABELS = {
  week: "7 day project",
  month: "30 day project",
  year: "365 day project",
  open: "Open project",
} as const;

const PROMPT_LABELS = {
  song: "Song a day",
  poem: "Poem a day",
  photo: "Photo a day",
  play: "Play a day",
  drawing: "Drawing a day",
  dance: "Dance a day",
  other: "Daily project",
} as const;

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function formatEntryDate(startDate: string, index: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(addDays(startDate, index));
}

function getPracticeTitle(project: Awaited<ReturnType<typeof getPublicStartProject>>) {
  if (!project) return "Daily project";
  if (project.prompt === "other" && project.customPractice.trim()) {
    return `${project.customPractice.trim()} a day`;
  }
  return PROMPT_LABELS[project.prompt];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; projectSlug: string }>;
}): Promise<Metadata> {
  const { username, projectSlug } = await params;
  const project = await getPublicStartProject(username, projectSlug);
  if (!project) return {};

  const title = `${project.title} by @${project.username}`;
  return {
    title,
    description: `${getPracticeTitle(project)} gathered on MOTBA.`,
    openGraph: {
      title,
      description: `${project.entries.length} linked pieces in one project wall.`,
      images: project.heroImageCloudinaryId
        ? [cloudinaryUrl(project.heroImageCloudinaryId, "og")]
        : undefined,
    },
  };
}

export default async function PublicStartProjectPage({
  params,
}: {
  params: Promise<{ username: string; projectSlug: string }>;
}) {
  const { username, projectSlug } = await params;
  const project = await getPublicStartProject(username, projectSlug);
  if (!project) notFound();

  const profileImage = project.profileImageCloudinaryId
    ? cloudinaryUrl(project.profileImageCloudinaryId, "artist-photo")
    : null;
  const heroImage = project.heroImageCloudinaryId
    ? cloudinaryUrl(project.heroImageCloudinaryId, "hero")
    : null;
  const platforms = new Map<string, number>();
  for (const entry of project.entries) {
    const platform = getMediaEmbedInfo(entry.url).platform;
    platforms.set(platform, (platforms.get(platform) ?? 0) + 1);
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section
        className="border-b-[3px] border-[var(--riso-ink)] bg-cover bg-center"
        style={
          heroImage
            ? {
                backgroundImage: `linear-gradient(rgb(0 0 0 / 0.72), rgb(0 0 0 / 0.72)), url(${heroImage})`,
              }
            : undefined
        }
      >
        <div className="mx-auto grid min-h-[360px] max-w-7xl content-end gap-6 px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end gap-4">
            {profileImage && (
              <div
                className="size-20 border-[3px] border-[var(--riso-ink)] bg-cover bg-center"
                style={{ backgroundImage: `url(${profileImage})` }}
                role="img"
                aria-label={`${project.title} profile picture`}
              />
            )}
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                @{project.username}
              </p>
              <h1
                className="mt-2 max-w-5xl text-5xl font-black uppercase leading-none sm:text-7xl"
                style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
              >
                {project.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="border border-border px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em]">
              {getPracticeTitle(project)}
            </span>
            <span className="border border-border px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em]">
              {DURATION_LABELS[project.duration]}
            </span>
            <span className="inline-flex items-center gap-2 border border-border px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em]">
              <CalendarDays className="size-3" />
              Since {formatEntryDate(project.startDate, 0)}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-4xl font-black tabular-nums">{project.entries.length}</p>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              pieces gathered
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...platforms.entries()].map(([platform, count]) => (
              <span
                key={platform}
                className="border border-border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
              >
                {platform} {count}
              </span>
            ))}
          </div>
        </div>

        {project.entries.length === 0 ? (
          <div className="grid min-h-[320px] place-items-center border-[3px] border-dashed border-border p-8 text-center">
            <div>
              <p className="text-5xl font-black tabular-nums">00</p>
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                The first link has not been added yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {project.entries.map((entry, index) => (
              <article
                key={entry.id}
                className="time-card-hover overflow-hidden border-[2px] border-border bg-background"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border p-3">
                  <div>
                    <p
                      className="text-lg font-black uppercase leading-none"
                      style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
                    >
                      Day {index + 1}
                    </p>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {formatEntryDate(project.startDate, index)}
                    </p>
                  </div>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="time-press p-2 text-muted-foreground hover:text-foreground"
                    aria-label={`Open day ${index + 1}`}
                  >
                    <LinkIcon className="size-4" />
                  </a>
                </div>
                <MediaEmbed url={entry.url} title={`${project.title} day ${index + 1}`} />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border px-4 py-6 text-center font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground sm:px-6">
        <a href={SITE_CONFIG.url} className="hover:text-foreground">
          Built on MOTBA
        </a>
      </section>
    </main>
  );
}
