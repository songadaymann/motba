import { NextRequest, NextResponse } from "next/server";
import { createPasskeyAuthenticationOptions } from "@/lib/passkeys";

export async function GET(request: NextRequest) {
  const options = await createPasskeyAuthenticationOptions(request);
  return NextResponse.json(options);
}
