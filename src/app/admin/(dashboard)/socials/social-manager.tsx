"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { ArtistSocialLink } from "@/types/database";
import { parseSocialUrl, SOCIAL_PLATFORM_LABELS } from "@/lib/social-links";

interface ArtistOption {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  artists: ArtistOption[];
}

export function SocialManager({ artists }: Props) {
  const [selectedArtist, setSelectedArtist] = useState("");
  const [search, setSearch] = useState("");
  const [links, setLinks] = useState<ArtistSocialLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editPlatform, setEditPlatform] = useState("");

  const filtered = artists.filter((artist) =>
    `${artist.name} ${artist.slug}`.toLowerCase().includes(search.toLowerCase())
  );
  const selectedInfo = artists.find((artist) => artist.id === selectedArtist);

  const fetchLinks = useCallback(async (artistId: string) => {
    if (!artistId) {
      setLinks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/artist-socials?artist_id=${artistId}`);
      const data = await res.json();
      if (Array.isArray(data)) setLinks(data);
    } catch (error) {
      console.error("Failed to fetch socials:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks(selectedArtist);
  }, [selectedArtist, fetchLinks]);

  const addLink = async () => {
    if (!selectedArtist || !newUrl) return;
    setAdding(true);
    try {
      const parsed = parseSocialUrl(newUrl);
      const res = await fetch("/api/admin/artist-socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_id: selectedArtist,
          url: newUrl,
          platform: parsed.platform,
          handle: parsed.handle,
          label: newLabel || null,
        }),
      });
      if (res.ok) {
        setNewUrl("");
        setNewLabel("");
        fetchLinks(selectedArtist);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add social");
      }
    } catch (error) {
      console.error("Failed to add social:", error);
    } finally {
      setAdding(false);
    }
  };

  const updateLink = async (
    id: string,
    updates: Partial<ArtistSocialLink>
  ) => {
    const res = await fetch("/api/admin/artist-socials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLinks((prev) => prev.map((link) => (link.id === id ? updated : link)));
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this social link?")) return;
    await fetch(`/api/admin/artist-socials?id=${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((link) => link.id !== id));
  };

  const moveLink = async (id: string, direction: "up" | "down") => {
    const idx = links.findIndex((link) => link.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= links.length) return;

    const newLinks = [...links];
    [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
    const updated = newLinks.map((link, index) => ({ ...link, sort_order: index }));
    setLinks(updated);

    await Promise.all([
      updateLink(updated[idx].id, { sort_order: idx }),
      updateLink(updated[swapIdx].id, { sort_order: swapIdx }),
    ]);
  };

  const startEdit = (link: ArtistSocialLink) => {
    setEditingId(link.id);
    setEditUrl(link.url);
    setEditLabel(link.label || "");
    setEditHandle(link.handle || "");
    setEditPlatform(link.platform);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateLink(editingId, {
      url: editUrl,
      label: editLabel || null,
      handle: editHandle || null,
      platform: editPlatform || parseSocialUrl(editUrl).platform,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Artist</label>
        <input
          type="text"
          placeholder="Search artists..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        {(search || !selectedArtist) && (
          <div className="max-h-60 overflow-y-auto rounded border border-border bg-background">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No artists found
              </div>
            ) : (
              filtered.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => {
                    setSelectedArtist(artist.id);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                    artist.id === selectedArtist ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <span className="font-medium">{artist.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    /{artist.slug}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {selectedInfo && !search && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{selectedInfo.name}</span>
            <span className="text-muted-foreground">/{selectedInfo.slug}</span>
            <button
              onClick={() => setSelectedArtist("")}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {selectedArtist && (
        <div className="space-y-3 rounded border border-border p-4">
          <label className="text-sm font-medium">Add Social</label>
          <input
            type="url"
            placeholder="URL"
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Display label (optional)"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={addLink}
            disabled={!newUrl || adding}
            className="inline-flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {adding ? "Adding..." : "Add Social"}
          </button>
        </div>
      )}

      {selectedArtist && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Socials ({links.length})</label>
            {loading && (
              <span className="text-xs text-muted-foreground">Loading...</span>
            )}
          </div>

          {links.length === 0 && !loading ? (
            <div className="rounded border border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No socials yet. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div key={link.id} className="space-y-2 rounded border border-border p-3">
                  {editingId === link.id ? (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(event) => setEditUrl(event.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          value={editPlatform}
                          onChange={(event) => setEditPlatform(event.target.value)}
                          placeholder="Platform"
                          className="rounded border border-border bg-background px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={editHandle}
                          onChange={(event) => setEditHandle(event.target.value)}
                          placeholder="Handle"
                          className="rounded border border-border bg-background px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                          placeholder="Label"
                          className="rounded border border-border bg-background px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="rounded bg-foreground px-3 py-1 text-xs text-background hover:opacity-80"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded border border-border px-3 py-1 text-xs hover:bg-accent"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            {link.label ||
                              SOCIAL_PLATFORM_LABELS[link.platform] ||
                              link.platform}
                          </span>
                          {link.handle && (
                            <span className="text-xs text-muted-foreground">
                              @{link.handle}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {link.platform}
                          </span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground"
                        >
                          {link.url}
                        </a>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {idx > 0 && (
                          <button
                            onClick={() => moveLink(link.id, "up")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent"
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {idx < links.length - 1 && (
                          <button
                            onClick={() => moveLink(link.id, "down")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent"
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(link)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
