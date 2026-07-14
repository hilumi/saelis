import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Liveness endpoint. Reports configuration presence only — never values. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    companionProvider: (process.env.COMPANION_PROVIDER ?? "mock") === "openai" ? "openai" : "mock",
    supabaseConfigured: hasSupabaseEnv(),
    timestamp: new Date().toISOString(),
  });
}
