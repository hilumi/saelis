import { NextResponse } from "next/server";

import { buildNotificationContent, NOTIFICATION_DEEP_LINKS } from "@/lib/notifications/copy";
import { sendExpoPush } from "@/lib/notifications/expo-push";
import { getNotificationPreferences, listActivePushTokens } from "@/lib/db/queries/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { resolveRequestAuth } from "@/lib/supabase/request-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/test — send a test notification to the
 * authenticated user's own registered devices. User-initiated, so it is not
 * a proactive notification (no daily-cap accounting) and quiet hours don't
 * apply. Copy comes from the tested catalog only.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Notifications aren't available yet." }, { status: 503 });
  }
  const { supabase, user } = await resolveRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const rate = checkRateLimit(`notif-test:${user.id}`, { limit: 3, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "One moment before another test." }, { status: 429 });
  }

  try {
    const [tokens, prefs] = await Promise.all([
      listActivePushTokens(supabase, user.id),
      getNotificationPreferences(supabase, user.id),
    ]);
    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "No registered device found. Enable notifications on your phone first." },
        { status: 404 },
      );
    }

    const previewMode = prefs?.preview_mode ?? "private";
    const content = buildNotificationContent("test", previewMode, "test");
    let delivered = 0;
    for (const token of tokens) {
      const outcome = await sendExpoPush({
        to: token.token,
        title: content.title,
        body: content.body,
        data: { url: NOTIFICATION_DEEP_LINKS.test, category: "test" },
      });
      if (outcome.status === "ok") delivered += 1;
    }

    return NextResponse.json({ ok: true, delivered });
  } catch {
    return NextResponse.json({ error: "Could not send a test just now." }, { status: 500 });
  }
}
