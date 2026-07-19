import { NextResponse } from "next/server";

import { recordAuthenticatedAnalyticsEvent } from "@/lib/analytics/record";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { resolveRequestAuth } from "@/lib/supabase/request-auth";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";

export const dynamic = "force-dynamic";

/** Camel-case API shape for the preferences row (defaults when none saved). */
function toApiShape(row: Awaited<ReturnType<typeof getNotificationPreferences>>) {
  return {
    enabled: row?.enabled ?? false,
    gentleCheckIns: row?.gentle_check_ins ?? true,
    wellnessReminders: row?.wellness_reminders ?? false,
    eveningReflections: row?.evening_reflections ?? false,
    userReminders: row?.user_reminders ?? true,
    preferredTimeMinutes: row?.preferred_time_minutes ?? 540,
    timezone: row?.timezone ?? "UTC",
    quietHoursStartMinutes: row?.quiet_hours_start_minutes ?? 1260,
    quietHoursEndMinutes: row?.quiet_hours_end_minutes ?? 480,
    previewMode: row?.preview_mode ?? "private",
    proactiveFrequency: row?.proactive_frequency ?? "daily",
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Notifications aren't available yet." }, { status: 503 });
  }
  const { supabase, user } = await resolveRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  try {
    const row = await getNotificationPreferences(supabase, user.id);
    return NextResponse.json({ preferences: toApiShape(row) });
  } catch {
    return NextResponse.json(
      { error: "Could not load your notification preferences." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Notifications aren't available yet." }, { status: 503 });
  }
  const { supabase, user } = await resolveRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const rate = checkRateLimit(`notif-prefs:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "One moment, please." }, { status: 429 });
  }

  const parsed = notificationPreferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Those preferences didn't look right." }, { status: 400 });
  }

  try {
    await upsertNotificationPreferences(supabase, user.id, parsed.data);
  } catch {
    return NextResponse.json(
      { error: "Could not save your notification preferences." },
      { status: 500 },
    );
  }

  void recordAuthenticatedAnalyticsEvent(supabase, user.id, {
    eventName: "notification_preference_updated",
    source: "mobile",
  });

  return NextResponse.json({ ok: true });
}
