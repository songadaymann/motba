import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StartProjectExperience } from "./start-project-experience";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Start a Daily Project",
  description: "Start a daily creative project and gather hosted work into one media wall.",
};

export default async function StartPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in?next=/start");

  return <StartProjectExperience />;
}
