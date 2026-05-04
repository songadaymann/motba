"use client";

import { FormEvent, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { ImageIcon, Send, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileField } from "@/components/TurnstileField";
import {
  CATEGORY_COLORS,
  CATEGORIES,
  PROJECT_FREQUENCIES,
  PROJECT_FREQUENCY_LABELS,
} from "@/lib/constants";

type SubmitState = "idle" | "submitting" | "sent" | "error";
type UploadKind = "artist" | "project";
type UploadedImage = {
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

function createUploadSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function SubmitForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadSessionId, setUploadSessionId] = useState(createUploadSessionId);
  const [artistImage, setArtistImage] = useState<UploadedImage | null>(null);
  const [projectImage, setProjectImage] = useState<UploadedImage | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  function handleUpload(kind: UploadKind, result: UploadResult) {
    const info =
      result.info && typeof result.info !== "string" ? result.info : null;
    if (!info?.public_id) return;

    const image = {
      publicId: info.public_id,
      previewUrl: info.secure_url || "",
    };

    if (kind === "artist") {
      setArtistImage(image);
    } else {
      setProjectImage(image);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (turnstileSiteKey && !turnstileToken) {
      setError("Please verify that you are human.");
      setState("error");
      return;
    }

    setState("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      submitterName: form.get("submitterName"),
      submitterEmail: form.get("submitterEmail"),
      submitterRelationship: form.get("submitterRelationship"),
      artistName: form.get("artistName"),
      artistWebsite: form.get("artistWebsite"),
      artistPhotoCloudinaryId: artistImage?.publicId || "",
      artworkTitle: form.get("artworkTitle"),
      category: form.get("category"),
      projectFrequency: form.get("projectFrequency"),
      yearsDisplay: form.get("yearsDisplay"),
      startYear: form.get("startYear"),
      endYear: form.get("endYear"),
      isOngoing: form.get("isOngoing") === "on",
      description: form.get("description"),
      externalUrl: form.get("externalUrl"),
      heroImageCloudinaryId: projectImage?.publicId || "",
      website: form.get("website"),
      turnstileToken,
    };

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "The submission could not be saved.");
      setTurnstileResetSignal((current) => current + 1);
      setState("error");
      return;
    }

    setState("sent");
    setArtistImage(null);
    setProjectImage(null);
    setUploadSessionId(createUploadSessionId());
    event.currentTarget.reset();
  }

  if (state === "sent") {
    return (
      <div className="max-w-2xl border border-border p-6">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-muted-foreground">
          Your submission was saved. Verify your email to add it to the review queue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl gap-8">
      <input
        className="hidden"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Your Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="submitterName">Name</Label>
            <Input id="submitterName" name="submitterName" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="submitterEmail">Email</Label>
            <Input id="submitterEmail" name="submitterEmail" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="projectFrequency">Project rhythm</Label>
            <select
              id="projectFrequency"
              name="projectFrequency"
              required
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              defaultValue="daily"
            >
              {PROJECT_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {PROJECT_FREQUENCY_LABELS[frequency]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Use yearly for projects that happen once a year.
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="submitterRelationship">Relationship</Label>
          <Input
            id="submitterRelationship"
            name="submitterRelationship"
            placeholder="Artist, representative, admirer, curator..."
          />
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Artist</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="artistName">Artist name</Label>
            <Input id="artistName" name="artistName" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="artistWebsite">Artist website</Label>
            <Input id="artistWebsite" name="artistWebsite" type="url" />
          </div>
        </div>
        <SubmissionImageUpload
          kind="artist"
          title="Artist photo"
          note="A portrait, avatar, or image that can represent the artist."
          uploadSessionId={uploadSessionId}
          image={artistImage}
          onUpload={handleUpload}
          onRemove={() => setArtistImage(null)}
        />
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Work Or Practice</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="artworkTitle">Title</Label>
            <Input id="artworkTitle" name="artworkTitle" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              required
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              defaultValue="art"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_COLORS[category].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_120px]">
          <div className="grid gap-2">
            <Label htmlFor="yearsDisplay">Years</Label>
            <Input id="yearsDisplay" name="yearsDisplay" placeholder="2009-present" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startYear">Start</Label>
            <Input id="startYear" name="startYear" type="number" inputMode="numeric" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endYear">End</Label>
            <Input id="endYear" name="endYear" type="number" inputMode="numeric" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="isOngoing" type="checkbox" className="size-4" />
          Ongoing
        </label>
        <div className="grid gap-2">
          <Label htmlFor="externalUrl">Primary link</Label>
          <Input id="externalUrl" name="externalUrl" type="url" />
        </div>
        <SubmissionImageUpload
          kind="project"
          title="Project image"
          note="An image that can represent this project across MOTBA."
          uploadSessionId={uploadSessionId}
          image={projectImage}
          onUpload={handleUpload}
          onRemove={() => setProjectImage(null)}
        />
        <div className="grid gap-2">
          <Label htmlFor="description">Notes</Label>
          <Textarea id="description" name="description" rows={6} />
        </div>
      </section>

      <TurnstileField
        siteKey={turnstileSiteKey}
        action="submit-artist"
        resetSignal={turnstileResetSignal}
        onTokenChange={setTurnstileToken}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-fit" disabled={state === "submitting"}>
        <Send />
        {state === "submitting" ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}

function SubmissionImageUpload({
  kind,
  title,
  note,
  uploadSessionId,
  image,
  onUpload,
  onRemove,
}: {
  kind: UploadKind;
  title: string;
  note: string;
  uploadSessionId: string;
  image: UploadedImage | null;
  onUpload: (kind: UploadKind, result: UploadResult) => void;
  onRemove: () => void;
}) {
  const Icon = kind === "artist" ? UserRound : ImageIcon;

  return (
    <div className="grid gap-2">
      <Label>{title}</Label>
      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div
          className="aspect-[4/3] border border-border bg-muted bg-cover bg-center"
          style={
            image?.previewUrl
              ? { backgroundImage: `url(${image.previewUrl})` }
              : undefined
          }
          aria-label={image ? title : undefined}
          role={image ? "img" : undefined}
        >
          {!image && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Icon className="size-8" strokeWidth={1.6} />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3 border border-border p-3">
          <div>
            <p className="text-sm font-medium">{note}</p>
            {image && (
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {image.publicId}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/public-sign"
              options={{
                folder: `motba/submissions/${uploadSessionId}`,
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
                <Button type="button" variant="outline" onClick={() => open()}>
                  <ImageIcon />
                  {image ? "Replace" : "Upload"}
                </Button>
              )}
            </CldUploadWidget>
            {image && (
              <Button type="button" variant="outline" onClick={onRemove}>
                <X />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
