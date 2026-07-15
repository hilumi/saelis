import { NextResponse } from "next/server";

import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/**
 * Liveness endpoint. Reports configuration PRESENCE only — never key values,
 * model names, database URLs, or internal errors.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    version: APP_VERSION,
    companionProvider: (process.env.COMPANION_PROVIDER ?? "mock") === "openai" ? "openai" : "mock",
    supabaseConfigured: hasSupabaseEnv(),
    openAIConfigured: isOpenAIConfigured(),
    streamingEnabled: true,
    timestamp: new Date().toISOString(),
  });
}
