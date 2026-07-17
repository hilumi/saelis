import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { NotificationPreferencesInput } from "@/lib/validation/wellness-onboarding";

type Client = SupabaseClient<Database>;

export async function getNotificationPreferences(
  supabase: Client,
  userId: string,
): Promise<Tables<"wellness_notification_preferences"> | null> {
  const { data, error } = await supabase
    .from("wellness_notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your reminder preferences.");
  return data;
}

export async function upsertNotificationPreferences(
  supabase: Client,
  userId: string,
  input: NotificationPreferencesInput,
): Promise<void> {
  const { error } = await supabase.from("wellness_notification_preferences").upsert(
    {
      user_id: userId,
      reminder_style: input.reminderStyle,
      morning_check_in: input.morningCheckIn,
      workout_reminders: input.workoutReminders,
      nourishment_reminders: input.nourishmentReminders,
      hydration_reminders: input.hydrationReminders,
      evening_reflection: input.eveningReflection,
      quiet_hours_start: input.quietHoursStart ?? null,
      quiet_hours_end: input.quietHoursEnd ?? null,
      max_daily_notifications: input.maxDailyNotifications,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save your reminder preferences.");
}
