"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import {
  CalendarDays,
  Check,
  CircleHelp,
  Copy,
  ExternalLink,
  ImageIcon,
  Link2,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { MediaEmbed, getMediaEmbedInfo } from "@/components/MediaEmbed";
import { normalizeUsername, slugifyProjectSegment } from "@/lib/project-slugs";
import type { SavedStartProject } from "@/lib/start-projects";

type DurationId = "week" | "month" | "year" | "open";
type PromptId = "song" | "poem" | "photo" | "play" | "drawing" | "dance" | "other";
type ProjectImageKind = "profile" | "hero";

type DurationOption = {
  id: DurationId;
  label: string;
  days: number | null;
};

type PromptOption = {
  id: PromptId;
  label: string;
  title: string;
  placeholder: string;
};

type ProjectImage = {
  publicId: string;
  previewUrl: string;
};

type UploadResultInfo = {
  public_id: string;
  secure_url?: string;
};

type UploadResult = {
  info?: UploadResultInfo | string;
};

type Entry = {
  id: string;
  url: string;
  label: string;
  createdAt: string;
};

type SavedProject = {
  id: string | null;
  slug: string | null;
  publicPath: string | null;
  uploadSessionId: string;
  title: string;
  duration: DurationId;
  prompt: PromptId;
  customPractice: string;
  startDate: string;
  profileImage: ProjectImage | null;
  heroImage: ProjectImage | null;
  entries: Entry[];
};

type SyncState = "idle" | "saving" | "saved" | "error";

const STORAGE_KEY = "motba-start-project-v1";

const DURATIONS: DurationOption[] = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
  { id: "open", label: "Open", days: null },
];

const PROMPTS: PromptOption[] = [
  {
    id: "song",
    label: "Song",
    title: "Song a day",
    placeholder: "https://youtube.com/...",
  },
  {
    id: "poem",
    label: "Poem",
    title: "Poem a day",
    placeholder: "https://instagram.com/p/...",
  },
  {
    id: "photo",
    label: "Photo",
    title: "Photo a day",
    placeholder: "https://tiktok.com/@.../video/...",
  },
  {
    id: "play",
    label: "Play",
    title: "Play a day",
    placeholder: "https://facebook.com/...",
  },
  {
    id: "drawing",
    label: "Drawing",
    title: "Drawing a day",
    placeholder: "https://x.com/.../status/...",
  },
  {
    id: "dance",
    label: "Dance",
    title: "Dance a day",
    placeholder: "https://vimeo.com/...",
  },
  {
    id: "other",
    label: "Other",
    title: "Daily project",
    placeholder: "https://...",
  },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEntryId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function createProjectId() {
  return createEntryId();
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function formatEntryDate(startDate: string, index: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(addDays(startDate, index));
}

function getInitialProject(): SavedProject {
  const prompt = PROMPTS[0];
  return {
    id: null,
    slug: null,
    publicPath: null,
    uploadSessionId: createProjectId(),
    title: "",
    duration: "week",
    prompt: prompt.id,
    customPractice: "",
    startDate: todayInputValue(),
    profileImage: null,
    heroImage: null,
    entries: [],
  };
}

function projectFromSavedProject(project: SavedStartProject): SavedProject {
  return {
    id: project.id,
    slug: project.slug,
    publicPath: project.publicPath,
    uploadSessionId: project.uploadSessionId,
    title: project.title,
    duration: project.duration,
    prompt: project.prompt,
    customPractice: project.customPractice,
    startDate: project.startDate,
    profileImage: project.profileImageCloudinaryId
      ? {
          publicId: project.profileImageCloudinaryId,
          previewUrl: cloudinaryUrl(project.profileImageCloudinaryId, "artist-photo"),
        }
      : null,
    heroImage: project.heroImageCloudinaryId
      ? {
          publicId: project.heroImageCloudinaryId,
          previewUrl: cloudinaryUrl(project.heroImageCloudinaryId, "hero"),
        }
      : null,
    entries: project.entries,
  };
}

function getStoredProject(): SavedProject {
  const initial = getInitialProject();
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return initial;

  try {
    const parsed = JSON.parse(saved) as SavedProject;
    return {
      ...initial,
      ...parsed,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      id: parsed.id ?? null,
      slug: parsed.slug ?? null,
      publicPath: parsed.publicPath ?? null,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return initial;
  }
}

function getGoalText(count: number, duration: DurationOption) {
  if (!duration.days) return `${count} days`;
  return count > duration.days
    ? `${duration.days} + ${count - duration.days}`
    : `${count} / ${duration.days}`;
}

function getPracticeTitle(project: SavedProject, prompt: PromptOption) {
  if (project.prompt === "other" && project.customPractice.trim()) {
    return `${project.customPractice.trim()} a day`;
  }
  return prompt.title;
}

function getProjectHeading(title: string) {
  return title.trim() || "Daily project";
}

export function StartProjectExperience({
  initialProject,
  initialUsername,
  siteUrl,
  userId,
}: {
  initialProject: SavedStartProject | null;
  initialUsername: string;
  siteUrl: string;
  userId: string;
}) {
  const [project, setProject] = useState<SavedProject>(() =>
    initialProject ? projectFromSavedProject(initialProject) : getInitialProject()
  );
  const [username, setUsername] = useState(initialProject?.username ?? initialUsername);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProject(initialProject ? projectFromSavedProject(initialProject) : getStoredProject());
      setUsername(initialProject?.username ?? initialUsername);
      setHasLoadedStorage(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialProject, initialUsername]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [hasLoadedStorage, project]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    if (!project.title.trim()) {
      setSyncState("idle");
      setSaveError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSyncState("saving");
      setSaveError(null);

      try {
        const response = await fetch("/api/start-project", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            username,
            title: project.title,
            duration: project.duration,
            prompt: project.prompt,
            customPractice: project.customPractice,
            startDate: project.startDate,
            uploadSessionId: project.uploadSessionId,
            profileImageCloudinaryId: project.profileImage?.publicId ?? null,
            heroImageCloudinaryId: project.heroImage?.publicId ?? null,
            entries: project.entries.map((entry) => ({
              id: entry.id,
              url: entry.url,
              label: entry.label,
              createdAt: entry.createdAt,
            })),
          }),
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          project?: SavedStartProject;
          error?: string;
        };

        if (!response.ok || !body.project) {
          throw new Error(body.error || "Could not save project.");
        }

        setUsername(body.project.username);
        setProject((current) => ({
          ...current,
          id: body.project!.id,
          slug: body.project!.slug,
          publicPath: body.project!.publicPath,
          uploadSessionId: body.project!.uploadSessionId,
        }));
        setSyncState("saved");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSyncState("error");
        setSaveError(error instanceof Error ? error.message : "Could not save project.");
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    hasLoadedStorage,
    project.id,
    project.title,
    project.duration,
    project.prompt,
    project.customPractice,
    project.startDate,
    project.uploadSessionId,
    project.profileImage?.publicId,
    project.heroImage?.publicId,
    project.entries,
    username,
  ]);

  const duration = DURATIONS.find((item) => item.id === project.duration) ?? DURATIONS[0];
  const prompt = PROMPTS.find((item) => item.id === project.prompt) ?? PROMPTS[0];
  const practiceTitle = getPracticeTitle(project, prompt);
  const nextDay = project.entries.length + 1;
  const progress = duration.days
    ? Math.min(100, Math.round((project.entries.length / duration.days) * 100))
    : 0;
  const previewPath = `/${normalizeUsername(username)}/${slugifyProjectSegment(project.title, "daily-project")}`;
  const sharePath = project.publicPath ?? previewPath;
  const shareUrl = new URL(sharePath, siteUrl).toString();

  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of project.entries) {
      const platform = getMediaEmbedInfo(entry.url).platform;
      counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [project.entries]);

  function selectPrompt(nextPrompt: PromptOption) {
    setProject((current) => ({
      ...current,
      prompt: nextPrompt.id,
    }));
  }

  function updateProjectImage(kind: ProjectImageKind, result: UploadResult) {
    const info =
      result.info && typeof result.info !== "string" ? result.info : null;
    if (!info?.public_id) return;

    const image = {
      publicId: info.public_id,
      previewUrl: info.secure_url || cloudinaryUrl(info.public_id, "thumbnail"),
    };

    setProject((current) => ({
      ...current,
      [kind === "profile" ? "profileImage" : "heroImage"]: image,
    }));
  }

  function removeProjectImage(kind: ProjectImageKind) {
    setProject((current) => ({
      ...current,
      [kind === "profile" ? "profileImage" : "heroImage"]: null,
    }));
  }

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setProject((current) => ({
      ...current,
      entries: [
        ...current.entries,
        {
          id: createEntryId(),
          url: trimmed,
          label: `Day ${current.entries.length + 1}`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setUrl("");
  }

  function removeEntry(id: string) {
    setProject((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  }

  function resetProject() {
    if (!confirm("Reset this project board?")) return;
    setProject(getInitialProject());
    setUrl("");
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main
      className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6"
      style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
    >
      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4 border-[3px] border-[var(--riso-ink)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black uppercase leading-none">
                {getProjectHeading(project.title)}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen((current) => !current)}
              className="time-press mt-1 p-1 text-muted-foreground hover:text-foreground"
              aria-expanded={helpOpen}
              aria-label="How this works"
            >
              <CircleHelp className="size-7" strokeWidth={1.7} />
            </button>
          </div>

          {helpOpen && (
            <div className="border border-border p-3 text-sm leading-relaxed text-muted-foreground">
              Pick a starting duration like a week, month, or year. You can keep going past it. Make the daily work on whatever platform fits the practice, then paste each day&apos;s public link here to build one wall of the whole run.
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="projectTitle">Project name</Label>
            <Input
              id="projectTitle"
              value={project.title}
              placeholder="Song a day in the basement"
              onChange={(event) =>
                setProject((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-3 border border-border p-3">
            <div className="grid gap-2">
              <Label htmlFor="projectUsername">Username</Label>
              <Input
                id="projectUsername"
                value={username}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Share URL
              </p>
              <a
                href={project.publicPath ?? previewPath}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-xs font-bold text-foreground underline decoration-[2px] underline-offset-4"
              >
                {shareUrl}
              </a>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyShareUrl}
                  disabled={!project.title.trim() || syncState === "saving"}
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {project.publicPath && (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={project.publicPath} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                      View
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {syncState === "saving"
                  ? "Saving..."
                  : syncState === "saved"
                    ? "Saved. This URL is public and shareable."
                    : syncState === "error"
                      ? saveError
                      : "Name the project to create its public page."}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-4 border border-border">
              {DURATIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setProject((current) => ({ ...current, duration: item.id }))
                  }
                  className={`time-press border-r border-border px-2 py-2 text-xs font-black uppercase last:border-r-0 ${
                    project.duration === item.id
                      ? "bg-foreground text-background"
                      : "hover:bg-accent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Practice</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROMPTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectPrompt(item)}
                  className={`time-press border border-border px-3 py-2 text-left text-xs font-black uppercase ${
                    project.prompt === item.id
                      ? "bg-foreground text-background"
                      : "hover:bg-accent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {project.prompt === "other" && (
              <Input
                value={project.customPractice}
                onChange={(event) => {
                  const value = event.target.value;
                  setProject((current) => ({
                    ...current,
                    customPractice: value,
                  }));
                }}
                placeholder="Quilt, sketch, field recording..."
              />
            )}
          </div>

          <div className="grid gap-3 border-t border-border pt-4">
            <ProjectImageUpload
              kind="profile"
              title="Profile picture"
              note="For the person or collective doing the project."
              uploadSessionId={project.uploadSessionId}
              userId={userId}
              image={project.profileImage}
              onUpload={updateProjectImage}
              onRemove={() => removeProjectImage("profile")}
            />
            <ProjectImageUpload
              kind="hero"
              title="Project image"
              note="A wide image that can represent the project."
              uploadSessionId={project.uploadSessionId}
              userId={userId}
              image={project.heroImage}
              onUpload={updateProjectImage}
              onRemove={() => removeProjectImage("hero")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startDate">Start date</Label>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <Input
                id="startDate"
                type="date"
                value={project.startDate}
                onChange={(event) =>
                  setProject((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.12em]">
              <span>{getGoalText(project.entries.length, duration)}</span>
              <span>{duration.days ? `${progress}%` : "Open"}</span>
            </div>
            <div className="h-3 border border-border">
              <div
                className="h-full bg-foreground transition-[width]"
                style={{ width: duration.days ? `${progress}%` : "100%" }}
              />
            </div>
          </div>

          <Button type="button" variant="outline" onClick={resetProject}>
            <RotateCcw />
            Reset
          </Button>
        </aside>

        <section className="grid content-start gap-5">
          <form
            onSubmit={addEntry}
            className="grid gap-3 border-[3px] border-[var(--riso-ink)] p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
          >
            <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <p>Day {nextDay}</p>
              <p>{formatEntryDate(project.startDate, nextDay - 1)}</p>
            </div>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={prompt.placeholder}
                className="pl-9"
                type="url"
              />
            </div>
            <Button type="submit" disabled={!url.trim()}>
              <Plus />
              Add
            </Button>
          </form>

          {platformCounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {platformCounts.map(([platform, count]) => (
                <span
                  key={platform}
                  className="border border-border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {platform} {count}
                </span>
              ))}
            </div>
          )}

          {project.entries.length === 0 ? (
            <div
              className="grid min-h-[360px] place-items-center border-[3px] border-dashed border-[var(--riso-ink)] bg-cover bg-center p-6 text-center"
              style={
                project.heroImage
                  ? {
                      backgroundImage: `linear-gradient(rgb(0 0 0 / 0.72), rgb(0 0 0 / 0.72)), url(${project.heroImage.previewUrl})`,
                    }
                  : undefined
              }
            >
              <div>
                {project.profileImage && (
                  <div
                    className="mx-auto mb-4 size-20 border-[2px] border-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${project.profileImage.previewUrl})` }}
                    aria-label="Project profile picture"
                    role="img"
                  />
                )}
                <p className="text-5xl font-black tabular-nums">00</p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {practiceTitle}
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
                      <p className="text-lg font-black uppercase leading-none">
                        Day {index + 1}
                      </p>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {formatEntryDate(project.startDate, index)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="time-press p-2 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove day ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <MediaEmbed url={entry.url} title={`${project.title} day ${index + 1}`} />
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ProjectImageUpload({
  kind,
  title,
  note,
  uploadSessionId,
  userId,
  image,
  onUpload,
  onRemove,
}: {
  kind: ProjectImageKind;
  title: string;
  note: string;
  uploadSessionId: string;
  userId: string;
  image: ProjectImage | null;
  onUpload: (kind: ProjectImageKind, result: UploadResult) => void;
  onRemove: () => void;
}) {
  const Icon = kind === "profile" ? UserRound : ImageIcon;
  const previewPreset = kind === "profile" ? "artist-photo" : "hero";

  return (
    <div className="grid gap-2">
      <div
        className={`border border-border bg-muted bg-cover bg-center ${
          kind === "profile" ? "aspect-square w-24" : "aspect-video"
        }`}
        style={
          image
            ? {
                backgroundImage: `url(${image.previewUrl || cloudinaryUrl(image.publicId, previewPreset)})`,
              }
            : undefined
        }
        role={image ? "img" : undefined}
        aria-label={image ? title : undefined}
      >
        {!image && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Icon className="size-6" strokeWidth={1.6} />
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <div>
          <p className="text-sm font-black uppercase leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CldUploadWidget
            signatureEndpoint="/api/cloudinary/public-sign"
            options={{
              folder: `motba/start/${userId}/${uploadSessionId}`,
              multiple: false,
              maxFiles: 1,
              maxFileSize: 7_000_000,
              resourceType: "image",
              clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
              sources: ["local", "camera", "url"],
            }}
            onSuccess={(result: UploadResult) => onUpload(kind, result)}
          >
            {({ open }) => (
              <Button type="button" variant="outline" size="sm" onClick={() => open()}>
                <ImageIcon />
                {image ? "Replace" : "Upload"}
              </Button>
            )}
          </CldUploadWidget>
          {image && (
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              <X />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
