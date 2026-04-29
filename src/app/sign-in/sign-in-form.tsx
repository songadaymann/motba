"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = "idle" | "sending" | "sent" | "passkey" | "error";

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/email/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        name: form.get("name"),
        nextPath,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Could not send the sign-in link.");
      setState("error");
      return;
    }

    setState("sent");
  }

  async function signInWithPasskey() {
    setState("passkey");
    setError(null);

    try {
      const optionsResponse = await fetch("/api/auth/passkeys/authenticate/options");
      const optionsJSON = await optionsResponse.json();
      const credential = await startAuthentication({ optionsJSON });
      const verificationResponse = await fetch("/api/auth/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: optionsJSON.challenge, credential }),
      });

      if (!verificationResponse.ok) {
        const body = (await verificationResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Passkey sign-in failed.");
      }

      window.location.href = nextPath;
    } catch (passkeyError) {
      setError(passkeyError instanceof Error ? passkeyError.message : "Passkey sign-in failed.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="max-w-md border border-border p-6">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-muted-foreground">
          Use the private link we sent to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <div className="grid max-w-md gap-6">
      <form onSubmit={sendLink} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email webauthn" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" />
        </div>
        <Button type="submit" disabled={state === "sending"}>
          <Mail />
          {state === "sending" ? "Sending..." : "Send sign-in link"}
        </Button>
      </form>

      <div className="border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={signInWithPasskey}
          disabled={state === "passkey"}
          className="w-full"
        >
          <KeyRound />
          {state === "passkey" ? "Waiting for passkey..." : "Sign in with passkey"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
