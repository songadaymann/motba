import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StartProjectExperience } from "./start-project-experience";
import { getCurrentSession } from "@/lib/auth";
import { SITE_CONFIG } from "@/lib/constants";
import { suggestUsername } from "@/lib/project-slugs";
import { getLatestStartProjectForUser } from "@/lib/start-projects";

export const metadata: Metadata = {
  title: "Start a Daily Project",
  description: "Start a daily creative project and gather hosted work into one media wall.",
};

export default async function StartPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in?next=/start");

  const project = await getLatestStartProjectForUser(session.user);

  return (
    <StartProjectExperience
      initialProject={project}
      initialUsername={session.user.username ?? suggestUsername(session.user)}
      siteUrl={SITE_CONFIG.url}
      userId={session.user.id}
    />
  );
}
