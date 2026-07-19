import { NextResponse } from "next/server";

import { recordAuthenticatedAnalyticsEvent } from "@/lib/analytics/record";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { resolveRequestAuth } from "@/lib/supabase/request-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/events — client-originated companion-experience events.
 *
 * Deliberately narrow: ONLY the Sprint 4 companion-experience event names may
 * arrive here (everything else stays server-recorded), consent is enforced by
 * recordAuthenticatedAnalyticsEvent (allow_product_analytics), metadata is
 * re-validated against the strict per-event allowlist, and identity comes
 * from the verified session — never the payload.
 */
const CLIENT_EVENT_NAMES = [
  "notification_permission_prompted",
  "notification_permission_denied",
  "conversation_starter_used",
  "memory_enabled",
  "memory_disabled",
  "memory_deleted",
  "temporary_mode_enabled",
] as const;

const clientEventSchema = z.object({
  eventName: z.enum(CLIENT_EVENT_NAMES),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ ok: true, recorded: false });
  }
  const { supabase, user } = await resolveRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const rate = checkRateLimit(`client-analytics:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const parsed = clientEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That event didn't look right." }, { status: 400 });
  }

  const result = await recordAuthenticatedAnalyticsEvent(supabase, user.id, {
    eventName: parsed.data.eventName,
    source: "mobile",
    metadata: parsed.data.metadata,
  });

  return NextResponse.json({ ok: true, recorded: result.recorded });
}
