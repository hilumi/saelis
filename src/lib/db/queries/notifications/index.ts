import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { NotificationPreferencesInput } from "@/lib/validation/notifications";

type Client = SupabaseClient<Database>;

/**
 * Companion-notification data access. All user-facing operations run on the
 * RLS client (own-row policies are the authority); only the delivery job
 * touches notification_deliveries, via the server-only admin client.
 */

/** Register (or re-register) a device token for the authenticated user. */
export async function upsertPushToken(
  supabase: Client,
  userId: string,
  token: string,
  platform: "ios" | "android" | "unknown",
): Promise<void> {
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      revoked_at: null,
      last_registered_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) throw new Error("Could not register this device for notifications.");
}

/** Remove a device token (sign-out or user disabling this device). */
export async function deletePushToken(
  supabase: Client,
  userId: string,
  token: string,
): Promise<void> {
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("token", token);
  if (error) throw new Error("Could not remove this device.");
}

export async function listActivePushTokens(
  supabase: Client,
  userId: string,
): Promise<Tables<"push_tokens">[]> {
  const { data, error } = await supabase
    .from("push_tokens")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new Error("Could not load registered devices.");
  return data ?? [];
}

/** Mark a token dead (provider reported DeviceNotRegistered). */
export async function revokePushToken(supabase: Client, tokenId: string): Promise<void> {
  const { error } = await supabase
    .from("push_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId);
  if (error) throw new Error("Could not update the device token.");
}

export async function getNotificationPreferences(
  supabase: Client,
  userId: string,
): Promise<Tables<"companion_notification_preferences"> | null> {
  const { data, error } = await supabase
    .from("companion_notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your notification preferences.");
  return data;
}

export async function upsertNotificationPreferences(
  supabase: Client,
  userId: string,
  input: NotificationPreferencesInput,
): Promise<void> {
  const { error } = await supabase.from("companion_notification_preferences").upsert(
    {
      user_id: userId,
      enabled: input.enabled,
      gentle_check_ins: input.gentleCheckIns,
      wellness_reminders: input.wellnessReminders,
      evening_reflections: input.eveningReflections,
      user_reminders: input.userReminders,
      preferred_time_minutes: input.preferredTimeMinutes,
      timezone: input.timezone,
      quiet_hours_start_minutes: input.quietHoursStartMinutes,
      quiet_hours_end_minutes: input.quietHoursEndMinutes,
      preview_mode: input.previewMode,
      proactive_frequency: input.proactiveFrequency,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save your notification preferences.");
}

/* ---------------- delivery log (admin client only) ---------------- */

/**
 * Claim a delivery slot. Returns false when the idempotency key already
 * exists — a concurrent or retried job must not double-send.
 */
export async function claimDelivery(
  admin: Client,
  input: {
    userId: string;
    category: Tables<"notification_deliveries">["category"];
    idempotencyKey: string;
  },
): Promise<{ claimed: boolean; deliveryId: string | null }> {
  const { data, error } = await admin
    .from("notification_deliveries")
    .insert({
      user_id: input.userId,
      category: input.category,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();
  if (error) {
    // Unique violation on idempotency_key → already claimed.
    return { claimed: false, deliveryId: null };
  }
  return { claimed: true, deliveryId: data.id };
}

export async function markDeliveryOutcome(
  admin: Client,
  deliveryId: string,
  outcome: { sent: boolean; providerStatus: string; tokenExpired: boolean },
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("notification_deliveries")
    .update({
      sent_at: outcome.sent ? now : null,
      failed_at: outcome.sent ? null : now,
      provider_status: outcome.providerStatus,
      token_expired: outcome.tokenExpired,
    })
    .eq("id", deliveryId);
}

/** True when a proactive delivery already exists for this local day. */
export async function hasProactiveDeliveryToday(
  admin: Client,
  userId: string,
  dateKey: string,
  proactiveCategories: Tables<"notification_deliveries">["category"][],
): Promise<boolean> {
  const { data, error } = await admin
    .from("notification_deliveries")
    .select("id, idempotency_key, category")
    .eq("user_id", userId)
    .in("category", proactiveCategories)
    .like("idempotency_key", `%:${dateKey}`);
  if (error) return true; // fail safe: never risk a double send
  return (data ?? []).length > 0;
}
