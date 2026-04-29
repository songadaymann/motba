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
import { useRouter } from "next/navigation";

interface Artist {
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
}

interface EditingCell {
  id: string;
  field: string;
}

const EDITABLE_FIELDS = [
  { key: "name", label: "Name", type: "text" },
  { key: "bio", label: "Bio", type: "textarea" },
  { key: "website_url", label: "Website", type: "text" },
  { key: "nationality", label: "Nationality", type: "text" },
  { key: "born_year", label: "Born", type: "number" },
  { key: "died_year", label: "Died", type: "number" },
  { key: "artist_photo_cloudinary_id", label: "Photo ID", type: "text" },
] as const;

export function ArtistsTable({ artists: initialArtists }: { artists: Artist[] }) {
  const [artists, setArtists] = useState(initialArtists);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit(id: string, field: string, currentValue: string | number | null) {
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

  const saveEdit = useCallback(async () => {
    if (!editing) return;

    const { id, field } = editing;
    const fieldDef = EDITABLE_FIELDS.find((f) => f.key === field);
    if (!fieldDef) return;

    let value: string | number | null = editValue.trim() || null;
    if (fieldDef.type === "number" && value !== null) {
      value = parseInt(value as string);
      if (isNaN(value)) value = null;
    }

    // Check if value actually changed
    const artist = artists.find((a) => a.id === id);
    if (!artist) return;
    const oldValue = (artist as unknown as Record<string, unknown>)[field] ?? null;
    if (value === oldValue || (value?.toString() === oldValue?.toString())) {
      setEditing(null);
      return;
    }

    setSaving(id);
    setEditing(null);

    const updateData: Record<string, unknown> = { [field]: value };

    // Auto-update slug when name changes
    if (field === "name" && value) {
      updateData.slug = (value as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 100);
    }

    try {
      const updated = await requestJson<Artist>("/api/admin/artists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updateData }),
      });
      setArtists((prev) =>
        prev.map((a) =>
          a.id === id ? updated : a
        )
      );
    } catch (error) {
      alert(`Error saving: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    setSaving(null);
  }, [editing, editValue, artists]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      setEditing(null);
    }
  }

  async function addArtist() {
    const name = prompt("Artist name:");
    if (!name?.trim()) return;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);

    try {
      const data = await requestJson<Artist>("/api/admin/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug, is_active: true }),
      });

      setArtists((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      router.refresh();
    } catch (error) {
      alert(`Error creating artist: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }
  }

  async function deleteArtist(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also delete all their artworks.`)) return;

    try {
      await requestJson<{ success: boolean }>(`/api/admin/artists?id=${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      alert(`Error deleting: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }

    setArtists((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  const filtered = search
    ? artists.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : artists;

  function renderCell(artist: Artist, field: typeof EDITABLE_FIELDS[number]) {
    const value = (artist as unknown as Record<string, unknown>)[field.key];
    const isEditing = editing?.id === artist.id && editing?.field === field.key;
    const isSaving = saving === artist.id;

    if (isEditing) {
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

    const displayValue = value?.toString() || "";

    return (
      <div
        onClick={() => startEdit(artist.id, field.key, value as string | number | null)}
        className={`cursor-pointer rounded px-1 py-0.5 min-h-[24px] hover:bg-accent transition-colors ${
          isSaving ? "opacity-50" : ""
        } ${!displayValue ? "text-muted-foreground/40 italic" : ""}`}
        title="Click to edit"
      >
        {field.key === "bio" && displayValue.length > 80
          ? displayValue.substring(0, 80) + "..."
          : displayValue || "—"}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Search artists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={addArtist} size="sm">
          + Add Artist
        </Button>
        <span className="text-sm text-muted-foreground">
          {filtered.length} artist{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {EDITABLE_FIELDS.map((f) => (
                <TableHead key={f.key} className="whitespace-nowrap">
                  {f.label}
                </TableHead>
              ))}
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((artist) => (
              <TableRow key={artist.id}>
                {EDITABLE_FIELDS.map((field) => (
                  <TableCell
                    key={field.key}
                    className={
                      field.key === "bio" ? "min-w-[200px] max-w-[300px]" :
                      field.key === "name" ? "min-w-[150px] font-medium" :
                      field.key === "website_url" ? "min-w-[180px]" :
                      "min-w-[80px]"
                    }
                  >
                    {renderCell(artist, field)}
                  </TableCell>
                ))}
                <TableCell>
                  <button
                    onClick={() => deleteArtist(artist.id, artist.name)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete artist"
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
                  No artists found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
