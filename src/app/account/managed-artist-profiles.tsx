"use client";

import { useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Pencil,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import { parseSocialUrl, SOCIAL_PLATFORM_LABELS } from "@/lib/social-links";
import type {
  ArtCategory,
  ArtistMembershipRole,
  ArtistSocialLink,
  ProjectFrequency,
  VerificationStatus,
} from "@/types/database";

type ManagedArtwork = {
  id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  project_frequency: ProjectFrequency;
  description: string | null;
  external_url: string | null;
  hero_image_cloudinary_id: string | null;
  status: VerificationStatus;
  sort_order: number;
};

type ManagedArtistProfile = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  artist_photo_cloudinary_id: string | null;
  born_year: number | null;
  died_year: number | null;
  nationality: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  membership: {
    id: string;
    role: ArtistMembershipRole;
    status: "active" | "invited" | "revoked";
  };
  artist_social_links: ArtistSocialLink[];
  artworks: ManagedArtwork[];
};

type UploadResultInfo = {
  public_id: string;
  secure_url?: string;
};

type UploadResult = {
  info?: UploadResultInfo | string;
};

type ImagePreset = "artist-photo" | "hero";

function canEdit(role: ArtistMembershipRole) {
  return role === "owner" || role === "representative";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  const errorMessage =
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
      ? data.error
      : "Request failed.";
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return data as T;
}

function uploadPublicId(result: UploadResult) {
  const info =
    result.info && typeof result.info !== "string" ? result.info : null;
  return info?.public_id ?? null;
}

function imageUrl(publicId: string | null, preset: ImagePreset) {
  return publicId ? cloudinaryUrl(publicId, preset) : "";
}

export function ManagedArtistProfiles({
  initialProfiles,
}: {
  initialProfiles: ManagedArtistProfile[];
}) {
  const [profiles, setProfiles] = useState(initialProfiles);

  function updateProfile(nextProfile: ManagedArtistProfile) {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === nextProfile.id ? nextProfile : profile
      )
    );
  }

  if (profiles.length === 0) {
    return (
      <p className="border border-border p-4 text-sm text-muted-foreground">
        No claimed artist profiles yet.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {profiles.map((profile) => (
        <ArtistProfileEditor
          key={profile.id}
          profile={profile}
          onChange={updateProfile}
        />
      ))}
    </div>
  );
}

function ArtistProfileEditor({
  profile,
  onChange,
}: {
  profile: ManagedArtistProfile;
  onChange: (profile: ManagedArtistProfile) => void;
}) {
  const editable = canEdit(profile.membership.role);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? "");
  const [photoId, setPhotoId] = useState(profile.artist_photo_cloudinary_id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

    try {
      const body = await requestJson<{ artist: ManagedArtistProfile }>(
        `/api/account/artists/${profile.id}/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bio,
            website_url: websiteUrl,
            artist_photo_cloudinary_id: photoId,
          }),
        }
      );
      onChange({
        ...profile,
        ...body.artist,
        membership: profile.membership,
        artist_social_links: profile.artist_social_links,
        artworks: profile.artworks,
      });
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  function updateArtwork(nextArtwork: ManagedArtwork) {
    onChange({
      ...profile,
      artworks: profile.artworks.map((artwork) =>
        artwork.id === nextArtwork.id ? nextArtwork : artwork
      ),
    });
  }

  function updateSocials(links: ArtistSocialLink[]) {
    onChange({
      ...profile,
      artist_social_links: links,
    });
  }

  return (
    <article className="border border-border">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {photoId ? (
            <img
              src={imageUrl(photoId, "artist-photo")}
              alt={profile.name}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              {profile.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{profile.name}</h3>
            <p className="text-sm text-muted-foreground">
              /{profile.slug} · {profile.membership.role}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/artists/${profile.slug}`}>View public page</a>
        </Button>
      </div>

      {!editable ? (
        <p className="p-4 text-sm text-muted-foreground">
          This profile is attached to your account, but this role cannot edit it yet.
        </p>
      ) : (
        <div className="grid gap-8 p-4">
          <section className="grid gap-4">
            <div>
              <h4 className="font-bold">Profile</h4>
              <p className="text-sm text-muted-foreground">
                These fields appear on the artist page.
              </p>
            </div>

            <ArtistImageUpload
              artistId={profile.id}
              title="Profile picture"
              note="Portrait, avatar, or image that represents the artist."
              icon="profile"
              publicId={photoId}
              preset="artist-photo"
              onUpload={setPhotoId}
              onRemove={() => setPhotoId(null)}
            />

            <div className="grid gap-2">
              <Label htmlFor={`artist-website-${profile.id}`}>Website</Label>
              <Input
                id={`artist-website-${profile.id}`}
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`artist-bio-${profile.id}`}>Bio</Label>
              <Textarea
                id={`artist-bio-${profile.id}`}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={5}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={saveProfile} disabled={saving}>
                <Save />
                {saving ? "Saving..." : "Save profile"}
              </Button>
              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}
            </div>
          </section>

          <SocialLinksEditor
            artistId={profile.id}
            initialLinks={profile.artist_social_links}
            onChange={updateSocials}
          />

          {profile.artworks.length > 0 && (
            <section className="grid gap-4">
              <div>
                <h4 className="font-bold">Projects</h4>
                <p className="text-sm text-muted-foreground">
                  Update project links, descriptions, and representative images.
                </p>
              </div>
              <div className="grid gap-5">
                {profile.artworks.map((artwork) => (
                  <ArtworkEditor
                    key={artwork.id}
                    artistId={profile.id}
                    artwork={artwork}
                    onChange={updateArtwork}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

function ArtistImageUpload({
  artistId,
  title,
  note,
  icon,
  publicId,
  preset,
  onUpload,
  onRemove,
}: {
  artistId: string;
  title: string;
  note: string;
  icon: "profile" | "hero";
  publicId: string | null;
  preset: ImagePreset;
  onUpload: (publicId: string) => void;
  onRemove: () => void;
}) {
  const Icon = icon === "profile" ? UserRound : ImageIcon;

  return (
    <div className="grid gap-2">
      <div
        className={`border border-border bg-muted bg-cover bg-center ${
          icon === "profile" ? "aspect-square w-24" : "aspect-video"
        }`}
        style={
          publicId
            ? { backgroundImage: `url(${imageUrl(publicId, preset)})` }
            : undefined
        }
        role={publicId ? "img" : undefined}
        aria-label={publicId ? title : undefined}
      >
        {!publicId && (
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
              folder: `motba/artists/${artistId}`,
              multiple: false,
              maxFiles: 1,
              maxFileSize: 7_000_000,
              resourceType: "image",
              clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
              sources: ["local", "camera", "url"],
            }}
            onSuccess={(result: UploadResult) => {
              const nextPublicId = uploadPublicId(result);
              if (nextPublicId) onUpload(nextPublicId);
            }}
          >
            {({ open }) => (
              <Button type="button" variant="outline" size="sm" onClick={() => open()}>
                <ImageIcon />
                {publicId ? "Replace" : "Upload"}
              </Button>
            )}
          </CldUploadWidget>
          {publicId && (
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

function SocialLinksEditor({
  artistId,
  initialLinks,
  onChange,
}: {
  artistId: string;
  initialLinks: ArtistSocialLink[];
  onChange: (links: ArtistSocialLink[]) => void;
}) {
  const [links, setLinks] = useState(
    [...initialLinks].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setNextLinks(nextLinks: ArtistSocialLink[]) {
    const sorted = [...nextLinks].sort((a, b) => a.sort_order - b.sort_order);
    setLinks(sorted);
    onChange(sorted);
  }

  async function addLink() {
    if (!newUrl) return;
    setBusy(true);
    setMessage(null);

    try {
      const parsed = parseSocialUrl(newUrl);
      const link = await requestJson<ArtistSocialLink>(
        `/api/account/artists/${artistId}/socials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: newUrl,
            platform: parsed.platform,
            handle: parsed.handle,
            label: newLabel || null,
          }),
        }
      );
      setNewUrl("");
      setNewLabel("");
      setNextLinks([...links, link]);
      setMessage("Social added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add social.");
    } finally {
      setBusy(false);
    }
  }

  async function updateLink(id: string, updates: Partial<ArtistSocialLink>) {
    const link = await requestJson<ArtistSocialLink>(
      `/api/account/artists/${artistId}/socials`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      }
    );
    setNextLinks(links.map((item) => (item.id === id ? link : item)));
    return link;
  }

  async function deleteLink(id: string) {
    if (!confirm("Delete this social link?")) return;
    setBusy(true);
    setMessage(null);

    try {
      await requestJson<{ success: boolean }>(
        `/api/account/artists/${artistId}/socials?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      setNextLinks(links.filter((link) => link.id !== id));
      setMessage("Social removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove social.");
    } finally {
      setBusy(false);
    }
  }

  async function moveLink(id: string, direction: "up" | "down") {
    const index = links.findIndex((link) => link.id === id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= links.length) return;

    const reordered = [...links];
    [reordered[index], reordered[swapIndex]] = [
      reordered[swapIndex],
      reordered[index],
    ];
    const nextLinks = reordered.map((link, sortOrder) => ({
      ...link,
      sort_order: sortOrder,
    }));
    setNextLinks(nextLinks);

    try {
      await Promise.all(
        [nextLinks[index], nextLinks[swapIndex]].map((link) =>
          requestJson<ArtistSocialLink>(
            `/api/account/artists/${artistId}/socials`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: link.id,
                sort_order: link.sort_order,
              }),
            }
          )
        )
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reorder socials.");
    }
  }

  function startEdit(link: ArtistSocialLink) {
    setEditingId(link.id);
    setEditUrl(link.url);
    setEditLabel(link.label || "");
    setEditHandle(link.handle || "");
    setEditPlatform(link.platform);
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(true);
    setMessage(null);

    try {
      await updateLink(editingId, {
        url: editUrl,
        label: editLabel || null,
        handle: editHandle || null,
        platform: editPlatform || parseSocialUrl(editUrl).platform,
      });
      setEditingId(null);
      setMessage("Social saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save social.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div>
        <h4 className="font-bold">Socials</h4>
        <p className="text-sm text-muted-foreground">
          These appear as icon links on the artist and artwork pages.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
        <Input
          type="url"
          placeholder="https://instagram.com/..."
          value={newUrl}
          onChange={(event) => setNewUrl(event.target.value)}
        />
        <Input
          type="text"
          placeholder="Label"
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
        />
        <Button type="button" onClick={addLink} disabled={!newUrl || busy}>
          Add social
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="border border-border p-3 text-sm text-muted-foreground">
          No socials yet.
        </p>
      ) : (
        <div className="grid gap-2">
          {links.map((link, index) => (
            <div key={link.id} className="border border-border p-3">
              {editingId === link.id ? (
                <div className="grid gap-2">
                  <Input
                    type="url"
                    value={editUrl}
                    onChange={(event) => setEditUrl(event.target.value)}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      type="text"
                      value={editPlatform}
                      onChange={(event) => setEditPlatform(event.target.value)}
                      placeholder="Platform"
                    />
                    <Input
                      type="text"
                      value={editHandle}
                      onChange={(event) => setEditHandle(event.target.value)}
                      placeholder="Handle"
                    />
                    <Input
                      type="text"
                      value={editLabel}
                      onChange={(event) => setEditLabel(event.target.value)}
                      placeholder="Label"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={saveEdit} disabled={busy}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {link.label ||
                          SOCIAL_PLATFORM_LABELS[link.platform] ||
                          link.platform}
                      </span>
                      {link.handle && (
                        <span className="text-sm text-muted-foreground">
                          @{link.handle}
                        </span>
                      )}
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.url}
                    </a>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => moveLink(link.id, "up")}
                      disabled={index === 0 || busy}
                      aria-label="Move social up"
                      title="Move social up"
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => moveLink(link.id, "down")}
                      disabled={index === links.length - 1 || busy}
                      aria-label="Move social down"
                      title="Move social down"
                    >
                      <ChevronDown />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => startEdit(link)}
                      disabled={busy}
                      aria-label="Edit social"
                      title="Edit social"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => deleteLink(link.id)}
                      disabled={busy}
                      aria-label="Delete social"
                      title="Delete social"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}

function ArtworkEditor({
  artistId,
  artwork,
  onChange,
}: {
  artistId: string;
  artwork: ManagedArtwork;
  onChange: (artwork: ManagedArtwork) => void;
}) {
  const [description, setDescription] = useState(artwork.description ?? "");
  const [externalUrl, setExternalUrl] = useState(artwork.external_url ?? "");
  const [heroId, setHeroId] = useState(artwork.hero_image_cloudinary_id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveArtwork() {
    setSaving(true);
    setMessage(null);

    try {
      const body = await requestJson<{ artwork: ManagedArtwork }>(
        `/api/account/artists/${artistId}/artworks/${artwork.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            external_url: externalUrl,
            hero_image_cloudinary_id: heroId,
          }),
        }
      );
      onChange({
        ...artwork,
        ...body.artwork,
      });
      setMessage("Project saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="font-semibold">{artwork.title}</h5>
          <a
            href={`/artworks/${artwork.slug}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            /artworks/{artwork.slug}
          </a>
        </div>
      </div>

      <ArtistImageUpload
        artistId={artistId}
        title="Project image"
        note="A representative image for this project page."
        icon="hero"
        publicId={heroId}
        preset="hero"
        onUpload={setHeroId}
        onRemove={() => setHeroId(null)}
      />

      <div className="grid gap-2">
        <Label htmlFor={`artwork-url-${artwork.id}`}>Project link</Label>
        <Input
          id={`artwork-url-${artwork.id}`}
          type="url"
          value={externalUrl}
          onChange={(event) => setExternalUrl(event.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`artwork-description-${artwork.id}`}>Description</Label>
        <Textarea
          id={`artwork-description-${artwork.id}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={saveArtwork} disabled={saving}>
          <Save />
          {saving ? "Saving..." : "Save project"}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
