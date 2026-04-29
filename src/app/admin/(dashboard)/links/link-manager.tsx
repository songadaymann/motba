"use client";

import { useState, useCallback, useEffect } from "react";
import type { ArtworkLink } from "@/types/database";

interface ArtworkOption {
  id: string;
  title: string;
  artistName: string;
  category: string;
}

interface Props {
  artworks: ArtworkOption[];
}

const LINK_TYPE_LABELS: Record<string, string> = {
  video: "Video",
  article: "Article",
  website: "Website",
  social: "Social",
};

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  wikipedia: "Wikipedia",
  medium: "Medium",
  substack: "Substack",
  twitter: "Twitter",
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
};

export function LinkManager({ artworks }: Props) {
  const [selectedArtwork, setSelectedArtwork] = useState("");
  const [search, setSearch] = useState("");
  const [links, setLinks] = useState<ArtworkLink[]>([]);
  const [loading, setLoading] = useState(false);

  // New link form
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const filtered = artworks.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.artistName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedInfo = artworks.find((a) => a.id === selectedArtwork);

  // Fetch links
  const fetchLinks = useCallback(async (artworkId: string) => {
    if (!artworkId) {
      setLinks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/artwork-links?artwork_id=${artworkId}`
      );
      const data = await res.json();
      if (Array.isArray(data)) setLinks(data);
    } catch (err) {
      console.error("Failed to fetch links:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks(selectedArtwork);
  }, [selectedArtwork, fetchLinks]);

  // Add link
  const addLink = async () => {
    if (!selectedArtwork || !newUrl || !newTitle) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/artwork-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artwork_id: selectedArtwork,
          url: newUrl,
          title: newTitle,
          description: newDescription || null,
        }),
      });
      if (res.ok) {
        setNewUrl("");
        setNewTitle("");
        setNewDescription("");
        fetchLinks(selectedArtwork);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add link");
      }
    } catch (err) {
      console.error("Failed to add link:", err);
    } finally {
      setAdding(false);
    }
  };

  // Delete link
  const deleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    try {
      await fetch(`/api/admin/artwork-links?id=${id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Update link
  const updateLink = async (
    id: string,
    updates: Partial<ArtworkLink>
  ) => {
    try {
      const res = await fetch("/api/admin/artwork-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? updated : l))
        );
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  // Move link up/down
  const moveLink = async (id: string, direction: "up" | "down") => {
    const idx = links.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= links.length) return;

    const newLinks = [...links];
    [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
    const updated = newLinks.map((l, i) => ({ ...l, sort_order: i }));
    setLinks(updated);

    await Promise.all([
      updateLink(updated[idx].id, { sort_order: idx }),
      updateLink(updated[swapIdx].id, { sort_order: swapIdx }),
    ]);
  };

  const startEdit = (link: ArtworkLink) => {
    setEditingId(link.id);
    setEditTitle(link.title);
    setEditDescription(link.description || "");
    setEditUrl(link.url);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateLink(editingId, {
      title: editTitle,
      description: editDescription || null,
      url: editUrl,
    } as Partial<ArtworkLink>);
    // Re-fetch to get updated platform detection
    fetchLinks(selectedArtwork);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Artwork selector — same pattern as image manager */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Artwork</label>
        <input
          type="text"
          placeholder="Search artworks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        {(search || !selectedArtwork) && (
          <div className="max-h-60 overflow-y-auto rounded border border-border bg-background">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No artworks found
              </div>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedArtwork(a.id);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    a.id === selectedArtwork
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  <span className="font-medium">{a.title}</span>
                  <span className="text-muted-foreground ml-2">
                    by {a.artistName}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs uppercase">
                    {a.category}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {selectedInfo && !search && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{selectedInfo.title}</span>
            <span className="text-muted-foreground">
              by {selectedInfo.artistName}
            </span>
            <button
              onClick={() => setSelectedArtwork("")}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Add link form */}
      {selectedArtwork && (
        <div className="space-y-3 rounded border border-border p-4">
          <label className="text-sm font-medium">Add Link</label>
          <input
            type="url"
            placeholder="URL (e.g. https://youtube.com/watch?v=...)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={addLink}
            disabled={!newUrl || !newTitle || adding}
            className="rounded bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {adding ? "Adding..." : "Add Link"}
          </button>
        </div>
      )}

      {/* Links list */}
      {selectedArtwork && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Links ({links.length})
            </label>
            {loading && (
              <span className="text-xs text-muted-foreground">Loading...</span>
            )}
          </div>

          {links.length === 0 && !loading ? (
            <div className="rounded border border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No links yet. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div
                  key={link.id}
                  className="rounded border border-border p-3 space-y-2"
                >
                  {editingId === link.id ? (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="rounded bg-foreground text-background px-3 py-1 text-xs hover:opacity-80"
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
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {link.title}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {LINK_TYPE_LABELS[link.link_type] || link.link_type}
                            </span>
                            {link.platform && (
                              <span className="text-[10px] text-muted-foreground">
                                {PLATFORM_ICONS[link.platform] || link.platform}
                              </span>
                            )}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground truncate block mt-0.5"
                          >
                            {link.url}
                          </a>
                          {link.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {link.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {idx > 0 && (
                            <button
                              onClick={() => moveLink(link.id, "up")}
                              className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent"
                              title="Move up"
                            >
                              &uarr;
                            </button>
                          )}
                          {idx < links.length - 1 && (
                            <button
                              onClick={() => moveLink(link.id, "down")}
                              className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent"
                              title="Move down"
                            >
                              &darr;
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(link)}
                            className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteLink(link.id)}
                            className="rounded border border-border px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                            title="Delete"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    </>
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
