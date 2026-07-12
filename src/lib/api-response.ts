import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/supabase/auth";

export function errorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: 400 });
}
