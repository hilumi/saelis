import { NextResponse } from "next/server";

import { recordAuthenticatedAnalyticsEvent } from "@/lib/analytics/record";
import { deletePushToken, upsertPushToken } from "@/lib/db/queries/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { resolveRequestAuth } from "@/lib/supabase/request-auth";
import {
  pushTokenRegistrationSchema,
  pushTokenRemovalSchema,
} from "@/lib/validation/notifications";

export const dynamic = "force-dynamic";

/**
 * Push-token registration for the authenticated user.
 *
 * POST   { token, platform } → register or replace (upsert on token; a device
 *         that signs into a different account moves with it — RLS plus the
 *         verified session decide ownership, never a client-supplied id).
 * DELETE { token }           → remove (sign-out on that device).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Notifications aren't available yet." }, { status: 503 });
  }
  const { supabase, user } = await resolveRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const rate = checkRateLimit(`notif-token:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "One moment, please." }, { status: 429 });
  }

  const parsed = pushTokenRegistrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That request didn't look right." }, { status: 400 });
  }

  try {
    await upsertPushToken(supabase, user.id, parsed.data.token, parsed.data.platform);
  } catch {
    return NextResponse.json(
      { error: "Could not register this device. Please try again." },
      { status: 500 },
    );
  }

  // Consent-gated, content-free analytics (best effort).
  void recordAuthenticatedAnalyticsEvent(supabase, user.id, {
    eventName: "notification_permission_granted",
    source: "mobile",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Notifications aren't available yet." }, { status: 503 });
  }
  const { supabase, user } = await resolveRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const parsed = pushTokenRemovalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That request didn't look right." }, { status: 400 });
  }

  try {
    await deletePushToken(supabase, user.id, parsed.data.token);
  } catch {
    return NextResponse.json({ error: "Could not remove this device." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
