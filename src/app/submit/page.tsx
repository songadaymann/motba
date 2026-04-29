import type { Metadata } from "next";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = {
  title: "Submit an Artist",
  description: "Submit an artist or project for consideration in The Museum of Time Based Art.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Submit an Artist</h1>
      <p className="mt-2 text-muted-foreground">
        Send a long-duration or daily-practice artist for review.
      </p>
      <div className="mt-10">
        <SubmitForm />
      </div>
    </div>
  );
}
