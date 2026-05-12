"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileField } from "@/components/TurnstileField";

type GuestbookFormState = "idle" | "signing" | "signed" | "error";

export function GuestbookForm({
  turnstileRequired,
  turnstileSiteKey,
}: {
  turnstileRequired: boolean;
  turnstileSiteKey: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<GuestbookFormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (turnstileRequired && !turnstileSiteKey) {
      setError("Human verification is not configured yet.");
      setState("error");
      return;
    }
    if (turnstileSiteKey && !turnstileToken) {
      setError("Please verify that you are human.");
      setState("error");
      return;
    }

    setState("signing");
    setError(null);

    const form = new FormData(formElement);
    const payload = {
      name: form.get("name"),
      message: form.get("message"),
      homepageUrl: form.get("homepageUrl"),
      website: form.get("website"),
      turnstileToken,
    };

    const response = await fetch("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(body?.error || "The guestbook could not be signed.");
      setTurnstileResetSignal((current) => current + 1);
      setState("error");
      return;
    }

    formElement.reset();
    setTurnstileToken("");
    setTurnstileResetSignal((current) => current + 1);
    setState("signed");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input
        className="hidden"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className="grid gap-2">
        <Label htmlFor="guestbook-name" className="font-mono text-xs uppercase">
          Name
        </Label>
        <Input
          id="guestbook-name"
          name="name"
          required
          maxLength={80}
          className="rounded-none border-2 bg-black font-mono text-white shadow-none"
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="guestbook-homepage" className="font-mono text-xs uppercase">
          Homepage
        </Label>
        <Input
          id="guestbook-homepage"
          name="homepageUrl"
          type="url"
          maxLength={500}
          placeholder="https://"
          className="rounded-none border-2 bg-black font-mono text-white shadow-none"
          autoComplete="url"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="guestbook-message" className="font-mono text-xs uppercase">
          Message
        </Label>
        <Textarea
          id="guestbook-message"
          name="message"
          required
          maxLength={1200}
          rows={7}
          className="min-h-40 rounded-none border-2 bg-black font-mono text-white shadow-none"
        />
      </div>

      <TurnstileField
        siteKey={turnstileSiteKey}
        action="guestbook"
        resetSignal={turnstileResetSignal}
        onTokenChange={setTurnstileToken}
      />
      {turnstileRequired && !turnstileSiteKey && (
        <p className="border-2 border-destructive p-3 font-mono text-sm text-destructive">
          Human verification is not configured yet.
        </p>
      )}

      {error && <p className="font-mono text-sm text-destructive">{error}</p>}
      {state === "signed" && (
        <p className="border-2 border-[#00ff66] bg-black p-3 font-mono text-sm text-[#00ff66]">
          Entry saved.
        </p>
      )}

      <Button
        type="submit"
        disabled={state === "signing" || (turnstileRequired && !turnstileSiteKey)}
        className="h-10 w-fit rounded-none border-2 border-white bg-[#ffff00] px-4 font-mono font-black text-black shadow-[4px_4px_0_#ff00ff] hover:bg-[#00ffff]"
      >
        <BookOpenCheck />
        {state === "signing" ? "Signing..." : "Sign Guestbook"}
      </Button>
    </form>
  );
}
