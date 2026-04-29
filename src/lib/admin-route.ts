import { NextResponse } from "next/server";
import { AdminAccessError, assertAdminAccess } from "@/lib/admin-access";

export async function requireAdmin(request: Request) {
  return assertAdminAccess(request.headers);
}

export function handleAdminRouteError(error: unknown) {
  if (error instanceof AdminAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";
  return NextResponse.json({ error: message }, { status: 500 });
}
