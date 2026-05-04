import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { saveStartProject } from "@/lib/start-projects";

const projectSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  username: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  duration: z.enum(["week", "month", "year", "open"]),
  prompt: z.enum(["song", "poem", "photo", "play", "drawing", "dance", "other"]),
  customPractice: z.string().trim().max(80).optional().nullable(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  uploadSessionId: z.string().trim().max(100).optional().nullable(),
  profileImageCloudinaryId: z.string().trim().max(300).optional().nullable(),
  heroImageCloudinaryId: z.string().trim().max(300).optional().nullable(),
  entries: z.array(
    z.object({
      id: z.string().trim().max(80).optional().nullable(),
      url: z.string().trim().url(),
      label: z.string().trim().max(80).optional().nullable(),
      createdAt: z.string().trim().optional().nullable(),
    })
  ).max(500),
});

export async function PUT(request: Request) {
  const session = await getSessionFromCookieValue(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1)
  );

  if (!session) {
    return NextResponse.json({ error: "Sign in to save your project." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the project fields and try again." }, { status: 400 });
  }

  try {
    const project = await saveStartProject(session.user, parsed.data);
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
