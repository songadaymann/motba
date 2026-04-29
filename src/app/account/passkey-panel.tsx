"use client";

import { useState } from "react";
import { KeyRound, LogOut, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Passkey = {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
};

export function PasskeyPanel({ initialPasskeys }: { initialPasskeys: Passkey[] }) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addPasskey() {
    setBusy(true);
    setMessage(null);

    try {
      const optionsResponse = await fetch("/api/auth/passkeys/register/options");
      const optionsJSON = await optionsResponse.json();
      const credential = await startRegistration({ optionsJSON });
      const verificationResponse = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: optionsJSON.challenge,
          credential,
          name: name || null,
        }),
      });

      const body = (await verificationResponse.json()) as {
        passkeys?: Passkey[];
        error?: string;
      };
      if (!verificationResponse.ok) throw new Error(body.error || "Could not add passkey.");

      setPasskeys(body.passkeys ?? []);
      setName("");
      setMessage("Passkey added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add passkey.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePasskey(id: string) {
    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => null)) as
      | { passkeys?: Passkey[]; error?: string }
      | null;

    if (response.ok) {
      setPasskeys(body?.passkeys ?? []);
      setMessage("Passkey removed.");
    } else {
      setMessage(body?.error || "Could not remove passkey.");
    }
    setBusy(false);
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Personal laptop, phone, security key..."
        />
        <Button type="button" onClick={addPasskey} disabled={busy}>
          <KeyRound />
          {busy ? "Working..." : "Add Passkey"}
        </Button>
      </div>

      <div className="grid gap-2">
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys yet.</p>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between gap-3 border border-border p-3"
            >
              <div>
                <p className="font-medium">{passkey.name || "Passkey"}</p>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(passkey.createdAt).toLocaleDateString()}
                  {passkey.lastUsedAt
                    ? ` · Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => deletePasskey(passkey.id)}
                disabled={busy}
                aria-label="Remove passkey"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Button type="button" variant="outline" className="w-fit" onClick={signOut}>
        <LogOut />
        Sign out
      </Button>
    </div>
  );
}
