import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { DailyMetricsInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export async function getDailyMetrics(
  supabase: Client,
  userId: string,
  metricDate: string,
): Promise<Tables<"wellness_daily_metrics"> | null> {
  const { data, error } = await supabase
    .from("wellness_daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("metric_date", metricDate)
    .maybeSingle();
  if (error) throw new Error("Could not load your measurements.");
  return data;
}

export async function listRecentMetrics(
  supabase: Client,
  userId: string,
  limit = 30,
): Promise<Tables<"wellness_daily_metrics">[]> {
  const { data, error } = await supabase
    .from("wellness_daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("metric_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load your measurements.");
  return data ?? [];
}

/** Every measurement is optional; a row may hold a single value. */
export async function upsertDailyMetrics(
  supabase: Client,
  userId: string,
  input: DailyMetricsInput,
): Promise<void> {
  const { error } = await supabase.from("wellness_daily_metrics").upsert(
    {
      user_id: userId,
      metric_date: input.metricDate,
      weight_lbs: input.weightLbs ?? null,
      waist_inches: input.waistInches ?? null,
      hip_inches: input.hipInches ?? null,
      chest_inches: input.chestInches ?? null,
      thigh_inches: input.thighInches ?? null,
      steps: input.steps ?? null,
      water_ounces: input.waterOunces ?? null,
      protein_grams: input.proteinGrams ?? null,
      calories: input.calories ?? null,
      fiber_grams: input.fiberGrams ?? null,
      sleep_hours: input.sleepHours ?? null,
      resting_heart_rate: input.restingHeartRate ?? null,
      active_minutes: input.activeMinutes ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,metric_date" },
  );
  if (error) throw new Error("Could not save your measurements.");
}
