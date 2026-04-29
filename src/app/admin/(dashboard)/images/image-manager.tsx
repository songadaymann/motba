"use client";

import { useState, useCallback, useEffect } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { cloudinaryUrl } from "@/lib/cloudinary/config";
import type { ArtworkImage } from "@/types/database";

interface ArtworkOption {
  id: string;
  title: string;
  artistName: string;
  category: string;
}

interface Props {
  artworks: ArtworkOption[];
}

type UploadResultInfo = {
  public_id: string;
  width?: number;
  height?: number;
};

type UploadResult = {
  info?: UploadResultInfo | string;
};

export function ImageManager({ artworks }: Props) {
  const [selectedArtwork, setSelectedArtwork] = useState<string>("");
  const [search, setSearch] = useState("");
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [pendingUploads, setPendingUploads] = useState<
    {
      cloudinary_public_id: string;
      width?: number;
      height?: number;
    }[]
  >([]);

  // Filter artworks by search
  const filtered = artworks.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.artistName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedInfo = artworks.find((a) => a.id === selectedArtwork);

  // Fetch images when artwork changes
  const fetchImages = useCallback(async (artworkId: string) => {
    if (!artworkId) {
      setImages([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/artwork-images?artwork_id=${artworkId}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setImages(data);
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages(selectedArtwork);
    setPendingUploads([]);
  }, [selectedArtwork, fetchImages]);

  // Save pending uploads to database
  const savePendingUploads = useCallback(async () => {
    if (!selectedArtwork || pendingUploads.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/artwork-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artwork_id: selectedArtwork,
          images: pendingUploads,
        }),
      });
      if (res.ok) {
        setPendingUploads([]);
        fetchImages(selectedArtwork);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, [selectedArtwork, pendingUploads, fetchImages]);

  // Auto-save when uploads complete
  useEffect(() => {
    if (pendingUploads.length > 0) {
      const timer = setTimeout(savePendingUploads, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingUploads, savePendingUploads]);

  // Update image metadata
  const updateImage = async (
    id: string,
    updates: { caption?: string; alt_text?: string; sort_order?: number }
  ) => {
    try {
      await fetch("/api/admin/artwork-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
      );
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  // Delete image
  const deleteImage = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      await fetch(`/api/admin/artwork-images?id=${id}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Move image up/down in sort order
  const moveImage = async (id: string, direction: "up" | "down") => {
    const idx = images.findIndex((img) => img.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    const newImages = [...images];
    [newImages[idx], newImages[swapIdx]] = [newImages[swapIdx], newImages[idx]];

    // Update sort orders
    const updated = newImages.map((img, i) => ({ ...img, sort_order: i }));
    setImages(updated);

    // Persist both changes
    await Promise.all([
      updateImage(updated[idx].id, { sort_order: idx }),
      updateImage(updated[swapIdx].id, { sort_order: swapIdx }),
    ]);
  };

  // Set as hero image
  const setAsHero = async (cloudinaryPublicId: string) => {
    if (!selectedArtwork) return;
    try {
      const res = await fetch("/api/admin/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedArtwork,
          hero_image_cloudinary_id: cloudinaryPublicId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set hero image");
      }
      alert("Hero image updated!");
    } catch (err) {
      console.error("Failed to set hero:", err);
    }
  };

  const startEdit = (img: ArtworkImage) => {
    setEditingId(img.id);
    setEditCaption(img.caption || "");
    setEditAlt(img.alt_text || "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateImage(editingId, { caption: editCaption, alt_text: editAlt });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Artwork selector */}
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

      {/* Upload widget */}
      {selectedArtwork && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Upload Images</label>
          <CldUploadWidget
            signatureEndpoint="/api/cloudinary/sign"
            options={{
              folder: `motba/artworks/${selectedInfo?.title.toLowerCase().replace(/\s+/g, "-") || selectedArtwork}`,
              multiple: true,
              maxFiles: 50,
              resourceType: "image",
              sources: ["local", "url", "camera"],
              styles: {
                palette: {
                  window: "#000000",
                  windowBorder: "#333333",
                  tabIcon: "#ffffff",
                  menuIcons: "#999999",
                  textDark: "#000000",
                  textLight: "#ffffff",
                  link: "#ffffff",
                  action: "#339933",
                  inactiveTabIcon: "#666666",
                  error: "#ff3333",
                  inProgress: "#339933",
                  complete: "#339933",
                  sourceBg: "#111111",
                },
              },
            }}
            onSuccess={(result: UploadResult) => {
              const info =
                result.info && typeof result.info !== "string"
                  ? result.info
                  : null;

              if (info) {
                setPendingUploads((prev) => [
                  ...prev,
                  {
                    cloudinary_public_id: info.public_id,
                    width: info.width,
                    height: info.height,
                  },
                ]);
              }
            }}
          >
            {({ open }) => (
              <button
                onClick={() => open()}
                className="w-full rounded border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                Click or drag images here to upload
                <br />
                <span className="text-xs">
                  Supports multiple files. Images upload directly to Cloudinary.
                </span>
              </button>
            )}
          </CldUploadWidget>

          {pendingUploads.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {saving
                ? "Saving..."
                : `${pendingUploads.length} image(s) uploading...`}
            </div>
          )}
        </div>
      )}

      {/* Image grid */}
      {selectedArtwork && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Images ({images.length})
            </label>
            {loading && (
              <span className="text-xs text-muted-foreground">Loading...</span>
            )}
          </div>

          {images.length === 0 && !loading ? (
            <div className="rounded border border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No images yet. Upload some above.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative rounded border border-border overflow-hidden bg-muted/20"
                >
                  <img
                    src={cloudinaryUrl(img.cloudinary_public_id, "thumbnail")}
                    alt={img.alt_text || "Artwork image"}
                    className="w-full aspect-[4/3] object-cover"
                  />

                  {/* Sort order badge */}
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold rounded px-1.5 py-0.5">
                    {idx + 1}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {idx > 0 && (
                      <button
                        onClick={() => moveImage(img.id, "up")}
                        className="bg-black/70 text-white text-xs rounded px-1.5 py-0.5 hover:bg-black"
                        title="Move up"
                      >
                        &larr;
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        onClick={() => moveImage(img.id, "down")}
                        className="bg-black/70 text-white text-xs rounded px-1.5 py-0.5 hover:bg-black"
                        title="Move down"
                      >
                        &rarr;
                      </button>
                    )}
                    <button
                      onClick={() => setAsHero(img.cloudinary_public_id)}
                      className="bg-black/70 text-white text-xs rounded px-1.5 py-0.5 hover:bg-green-700"
                      title="Set as hero image"
                    >
                      Hero
                    </button>
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="bg-black/70 text-red-400 text-xs rounded px-1.5 py-0.5 hover:bg-red-800 hover:text-white"
                      title="Delete"
                    >
                      Del
                    </button>
                  </div>

                  {/* Caption / alt text */}
                  <div className="p-2 text-xs space-y-1">
                    {editingId === img.id ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Caption..."
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Alt text..."
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            className="rounded bg-foreground text-background px-2 py-0.5 text-xs hover:opacity-80"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(img)}
                        className="text-left w-full text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {img.caption || img.alt_text ? (
                          <>
                            {img.caption && (
                              <div className="truncate">{img.caption}</div>
                            )}
                            {img.alt_text && (
                              <div className="truncate text-muted-foreground/60">
                                alt: {img.alt_text}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="italic">Click to add caption...</div>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
