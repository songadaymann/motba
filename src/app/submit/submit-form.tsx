"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_COLORS, CATEGORIES } from "@/lib/constants";

type SubmitState = "idle" | "submitting" | "sent" | "error";

export function SubmitForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      submitterName: form.get("submitterName"),
      submitterEmail: form.get("submitterEmail"),
      submitterRelationship: form.get("submitterRelationship"),
      artistName: form.get("artistName"),
      artistWebsite: form.get("artistWebsite"),
      artworkTitle: form.get("artworkTitle"),
      category: form.get("category"),
      yearsDisplay: form.get("yearsDisplay"),
      startYear: form.get("startYear"),
      endYear: form.get("endYear"),
      isOngoing: form.get("isOngoing") === "on",
      description: form.get("description"),
      externalUrl: form.get("externalUrl"),
      website: form.get("website"),
    };

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "The submission could not be saved.");
      setState("error");
      return;
    }

    setState("sent");
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
        <div className="grid gap-2">
          <Label htmlFor="description">Notes</Label>
          <Textarea id="description" name="description" rows={6} />
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-fit" disabled={state === "submitting"}>
        <Send />
        {state === "submitting" ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
