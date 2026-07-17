import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Permanently deletes the user's Saelis Her data through the existing
 * RLS-enforced session (no separate insecure pathway). Order respects
 * foreign keys; child tables cascade from their parents. Full account
 * deletion continues to cascade through profiles as before — this is the
 * in-app, wellness-only variant.
 */
export async function deleteAllWellnessData(supabase: Client, userId: string): Promise<void> {
  // Postpartum first (isolated Restore data), then dependents, then roots.
  const tables = [
    "postpartum_check_ins",
    "postpartum_profiles",
    "wellness_workout_logs", // exercise logs cascade
    "wellness_nutrition_logs",
    "wellness_daily_metrics",
    "wellness_daily_plans",
    "wellness_meal_plans",
    "wellness_programs", // weeks cascade
    "wellness_milestones",
    "wellness_daily_check_ins",
    "wellness_goals",
    "wellness_onboarding_drafts",
    "wellness_notification_preferences",
    "wellness_enrollments",
    "women_wellness_profiles",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error)
      throw new Error("Could not remove your wellness data. Nothing was partially hidden.");
  }
}
