import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next) ?? "/account";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
      <p className="mt-2 text-muted-foreground">
        Use email first. Add a passkey later from your account.
      </p>
      {params.error && (
        <p className="mt-6 max-w-md border border-destructive p-3 text-sm text-destructive">
          That link is missing, expired, or already used.
        </p>
      )}
      <div className="mt-8">
        <SignInForm nextPath={nextPath} />
      </div>
    </div>
  );
}
