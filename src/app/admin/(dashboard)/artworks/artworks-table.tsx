"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS, CATEGORIES, type ArtCategory } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface ArtistRef {
  id: string;
  name: string;
  website_url?: string | null;
}

interface Artwork {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  is_ongoing: boolean;
  description: string | null;
  external_url: string | null;
  hero_image_cloudinary_id: string | null;
  status: string;
  artists: ArtistRef;
}

interface EditingCell {
  id: string;
  field: string;
}

type FieldType = "text" | "textarea" | "number" | "select" | "boolean";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

const EDITABLE_FIELDS: FieldDef[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "artist_id", label: "Artist", type: "select" },
  { key: "category", label: "Category", type: "select", options: [...CATEGORIES] },
  { key: "years_display", label: "Years", type: "text" },
  { key: "start_year", label: "Start Y", type: "number" },
  { key: "start_month", label: "Start M", type: "number" },
  { key: "start_day", label: "Start D", type: "number" },
  { key: "end_year", label: "End Y", type: "number" },
  { key: "end_month", label: "End M", type: "number" },
  { key: "end_day", label: "End D", type: "number" },
  { key: "is_ongoing", label: "Ongoing", type: "boolean" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "external_url", label: "Project Link", type: "text" },
  { key: "artist_website", label: "Artist Website", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["verified", "needs_verification", "needs_input"] },
  { key: "hero_image_cloudinary_id", label: "Hero Image ID", type: "text" },
];

export function ArtworksTable({
  artworks: initialArtworks,
  artists,
}: {
  artworks: Artwork[];
  artists: ArtistRef[];
}) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current && inputRef.current.type !== "select-one") {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [editing]);

  function startEdit(id: string, field: string, currentValue: unknown) {
    setEditing({ id, field });
    setEditValue(currentValue?.toString() ?? "");
  }

  async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data as T;
  }

  const patchArtwork = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      return requestJson<Artwork>("/api/admin/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
    },
    []
  );

  const saveEdit = useCallback(async () => {
    if (!editing) return;

    const { id, field } = editing;
    const fieldDef = EDITABLE_FIELDS.find((f) => f.key === field);
    if (!fieldDef) return;

    let value: string | number | boolean | null = editValue.trim() || null;
    if (fieldDef.type === "number" && value !== null) {
      value = parseInt(value as string);
      if (isNaN(value)) value = null;
    }
    if (fieldDef.type === "boolean") {
      value = editValue === "true";
    }

    const artwork = artworks.find((a) => a.id === id);
    if (!artwork) return;

    // artist_website is a virtual field that maps to artists.website_url
    if (field === "artist_website") {
      const oldValue = artwork.artists?.website_url ?? null;
      if (value === oldValue || (value?.toString() === oldValue?.toString())) {
        setEditing(null);
        return;
      }
      setSaving(id);
      setEditing(null);
      try {
        const updatedArtist = await requestJson<ArtistRef & { slug?: string }>("/api/admin/artists", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: artwork.artist_id, website_url: value }),
        });
        setArtworks((prev) =>
          prev.map((a) =>
            a.artist_id === artwork.artist_id
              ? { ...a, artists: { ...a.artists, website_url: updatedArtist.website_url ?? null } }
              : a
          )
        );
      } catch (error) {
        alert(`Error saving: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
      setSaving(null);
      return;
    }

    const oldValue = (artwork as unknown as Record<string, unknown>)[field] ?? null;
    if (value === oldValue || (value?.toString() === oldValue?.toString())) {
      setEditing(null);
      return;
    }

    setSaving(id);
    setEditing(null);

    const updateData: Record<string, unknown> = { [field]: value };

    if (field === "title" && value) {
      const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
      const artistName = artistMap.get(artwork.artist_id) || "";
      updateData.slug = `${artistName}-${value}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 100);
    }

    try {
      const updated = await patchArtwork(id, updateData);
      setArtworks((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );
    } catch (error) {
      alert(`Error saving: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    setSaving(null);
  }, [artists, editing, editValue, artworks, patchArtwork]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      setEditing(null);
    }
  }

  async function addArtwork() {
    if (artists.length === 0) {
      alert("Create an artist first.");
      return;
    }

    const title = prompt("Artwork title:");
    if (!title?.trim()) return;

    const artistId = artists[0].id;
    try {
      const data = await requestJson<Artwork>("/api/admin/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_id: artistId,
          title: title.trim(),
          category: "art",
          status: "needs_verification",
          is_ongoing: false,
        }),
      });

      setArtworks((prev) =>
        [...prev, data].sort((a, b) => a.title.localeCompare(b.title))
      );
      router.refresh();
    } catch (error) {
      alert(`Error creating artwork: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }
  }

  async function deleteArtwork(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;

    try {
      await requestJson<{ success: boolean }>(`/api/admin/artworks?id=${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      alert(`Error deleting: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }

    setArtworks((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  const filtered = artworks.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
        !a.artists?.name?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterCategory && a.category !== filterCategory) return false;
    return true;
  });

  function renderCell(artwork: Artwork, field: FieldDef) {
    const value = field.key === "artist_website"
      ? artwork.artists?.website_url ?? null
      : (artwork as unknown as Record<string, unknown>)[field.key];
    const isEditing = editing?.id === artwork.id && editing?.field === field.key;
    const isSaving = saving === artwork.id;

    if (isEditing) {
      if (field.key === "artist_id") {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              // Auto-save on select change
              setTimeout(() => {
                setEditing(null);
                const newArtistId = e.target.value;
                setSaving(artwork.id);
                void patchArtwork(artwork.id, { artist_id: newArtistId })
                  .then((updated) => {
                    setArtworks((prev) =>
                      prev.map((a) => (a.id === artwork.id ? updated : a))
                    );
                  })
                  .catch((error) => {
                    alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                  })
                  .finally(() => {
                    setSaving(null);
                  });
              }, 0);
            }}
            onBlur={saveEdit}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        );
      }

      if (field.type === "select" && field.options) {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setTimeout(() => {
                setEditing(null);
                setSaving(artwork.id);
                void patchArtwork(artwork.id, {
                  [field.key]: e.target.value,
                })
                  .then((updated) => {
                    setArtworks((prev) =>
                      prev.map((a) => (a.id === artwork.id ? updated : a))
                    );
                  })
                  .catch((error) => {
                    alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                  })
                  .finally(() => {
                    setSaving(null);
                  });
              }, 0);
            }}
            onBlur={saveEdit}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }

      if (field.type === "boolean") {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setTimeout(() => {
                setEditing(null);
                setSaving(artwork.id);
                void patchArtwork(artwork.id, {
                  [field.key]: e.target.value === "true",
                })
                  .then((updated) => {
                    setArtworks((prev) =>
                      prev.map((a) => (a.id === artwork.id ? updated : a))
                    );
                  })
                  .catch((error) => {
                    alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                  })
                  .finally(() => {
                    setSaving(null);
                  });
              }, 0);
            }}
            onBlur={saveEdit}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        );
      }

      if (field.type === "textarea") {
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[60px] rounded border border-input bg-background px-2 py-1 text-sm resize-y"
            rows={3}
          />
        );
      }

      return (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          type={field.type === "number" ? "number" : "text"}
          className="h-7 text-sm"
        />
      );
    }

    // Display mode
    const isSavingRow = isSaving;

    if (field.key === "artist_id") {
      const artistName = artwork.artists?.name || "Unknown";
      return (
        <div
          onClick={() => startEdit(artwork.id, field.key, artwork.artist_id)}
          className={`cursor-pointer rounded px-1 py-0.5 hover:bg-accent transition-colors ${isSavingRow ? "opacity-50" : ""}`}
          title="Click to edit"
        >
          {artistName}
        </div>
      );
    }

    if (field.key === "category") {
      const cat = value as ArtCategory;
      return (
        <div
          onClick={() => startEdit(artwork.id, field.key, cat)}
          className="cursor-pointer"
          title="Click to edit"
        >
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: CATEGORY_COLORS[cat]?.bg,
              color: CATEGORY_COLORS[cat]?.bg,
            }}
          >
            {CATEGORY_COLORS[cat]?.label || cat}
          </Badge>
        </div>
      );
    }

    if (field.type === "boolean") {
      return (
        <div
          onClick={() => startEdit(artwork.id, field.key, value?.toString() ?? "false")}
          className={`cursor-pointer rounded px-1 py-0.5 hover:bg-accent transition-colors ${isSavingRow ? "opacity-50" : ""}`}
          title="Click to edit"
        >
          {value ? "Yes" : "No"}
        </div>
      );
    }

    if (field.key === "status") {
      const statusColors: Record<string, string> = {
        verified: "text-green-600",
        needs_verification: "text-yellow-600",
        needs_input: "text-red-600",
      };
      return (
        <div
          onClick={() => startEdit(artwork.id, field.key, value as string)}
          className={`cursor-pointer rounded px-1 py-0.5 hover:bg-accent transition-colors text-xs font-medium ${statusColors[value as string] || ""} ${isSavingRow ? "opacity-50" : ""}`}
          title="Click to edit"
        >
          {(value as string)?.replace(/_/g, " ") || "—"}
        </div>
      );
    }

    const displayValue = value?.toString() || "";

    return (
      <div
        onClick={() => startEdit(artwork.id, field.key, value as string | number | null)}
        className={`cursor-pointer rounded px-1 py-0.5 min-h-[24px] hover:bg-accent transition-colors truncate ${
          isSavingRow ? "opacity-50" : ""
        } ${!displayValue ? "text-muted-foreground/40 italic" : ""}`}
        title={displayValue || "Click to edit"}
      >
        {displayValue || "—"}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search artworks or artists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_COLORS[cat].label}
            </option>
          ))}
        </select>
        <Button onClick={addArtwork} size="sm">
          + Add Artwork
        </Button>
        <span className="text-sm text-muted-foreground">
          {filtered.length} artwork{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {EDITABLE_FIELDS.map((f) => (
                <TableHead key={f.key} className="whitespace-nowrap text-xs">
                  {f.label}
                </TableHead>
              ))}
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((artwork) => (
              <TableRow key={artwork.id}>
                {EDITABLE_FIELDS.map((field) => (
                  <TableCell
                    key={field.key}
                    className={
                      field.key === "description" ? "min-w-[180px] max-w-[250px] overflow-hidden" :
                      field.key === "title" ? "min-w-[150px] max-w-[200px] font-medium overflow-hidden" :
                      field.key === "external_url" || field.key === "artist_website" || field.key === "hero_image_cloudinary_id" ? "min-w-[120px] max-w-[180px] overflow-hidden" :
                      field.type === "number" ? "w-[60px]" :
                      "min-w-[80px]"
                    }
                  >
                    {renderCell(artwork, field)}
                  </TableCell>
                ))}
                <TableCell>
                  <button
                    onClick={() => deleteArtwork(artwork.id, artwork.title)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete artwork"
                  >
                    Delete
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={EDITABLE_FIELDS.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No artworks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
