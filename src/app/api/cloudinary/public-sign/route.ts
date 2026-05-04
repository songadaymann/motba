import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  paramsToSign: z.record(z.string(), z.unknown()),
});

const BLOCKED_PARAMS = new Set([
  "eager",
  "transformation",
  "raw_convert",
  "responsive_breakpoints",
]);

function isScalarUploadParam(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const { paramsToSign } = parsed.data;
  const folder = paramsToSign.folder;

  if (
    typeof folder !== "string" ||
    !/^motba\/(?:submissions|start)\/[a-z0-9-]{16,80}$/i.test(folder)
  ) {
    return NextResponse.json({ error: "Invalid upload folder." }, { status: 400 });
  }

  if (folder.startsWith("motba/start/")) {
    const session = await getSessionFromCookieValue(
      request.cookies.get(SESSION_COOKIE)?.value
    );
    if (!session) {
      return NextResponse.json({ error: "Sign in to upload project images." }, { status: 401 });
    }
  }

  for (const param of Object.keys(paramsToSign)) {
    if (BLOCKED_PARAMS.has(param)) {
      return NextResponse.json({ error: "Unsupported upload option." }, { status: 400 });
    }
  }

  const params = Object.fromEntries(
    Object.entries(paramsToSign).filter(([, value]) => isScalarUploadParam(value))
  );

  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({ signature });
}
