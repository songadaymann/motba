import { listTimelineEntries } from "@/lib/d1";
import { TimelineShell } from "@/components/timeline/TimelineShell";
import type { TimelineEntry } from "@/types/database";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Interactive timeline of long-duration and daily-practice art projects.",
};

export default async function TimelinePage() {
  const data = await listTimelineEntries();

  return <TimelineShell entries={data as TimelineEntry[]} />;
}
