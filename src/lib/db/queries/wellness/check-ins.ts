import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { DailyCheckInInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export async function getDailyCheckIn(
  supabase: Client,
  userId: string,
  checkInDate: string,
): Promise<Tables<"wellness_daily_check_ins"> | null> {
  const { data, error } = await supabase
    .from("wellness_daily_check_ins")
    .select("*")
    .eq("user_id", userId)
    .eq("check_in_date", checkInDate)
    .maybeSingle();
  if (error) throw new Error("Could not load that check-in.");
  return data;
}

export async function listRecentCheckIns(
  supabase: Client,
  userId: string,
  limit = 14,
): Promise<Tables<"wellness_daily_check_ins">[]> {
  const { data, error } = await supabase
    .from("wellness_daily_check_ins")
    .select("*")
    .eq("user_id", userId)
    .order("check_in_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load your check-ins.");
  return data ?? [];
}

/** One check-in per day (database unique constraint); upsert is idempotent. */
export async function upsertDailyCheckIn(
  supabase: Client,
  userId: string,
  input: DailyCheckInInput,
): Promise<Tables<"wellness_daily_check_ins">> {
  const { data, error } = await supabase
    .from("wellness_daily_check_ins")
    .upsert(
      {
        user_id: userId,
        check_in_date: input.checkInDate,
        sleep_hours: input.sleepHours ?? null,
        sleep_quality: input.sleepQuality ?? null,
        energy: input.energy ?? null,
        mood: input.mood ?? null,
        stress: input.stress ?? null,
        soreness: input.soreness ?? null,
        pain_level: input.painLevel ?? null,
        pain_location: input.painLocation,
        readiness: input.readiness ?? null,
        available_minutes: input.availableMinutes ?? null,
        available_location: input.availableLocation ?? null,
        illness_or_injury_concern: input.illnessOrInjuryConcern,
        chest_pain: input.chestPain,
        dizziness_or_fainting: input.dizzinessOrFainting,
        shortness_of_breath: input.shortnessOfBreath,
        severe_headache: input.severeHeadache,
        self_harm_concern: input.selfHarmConcern,
        notes: input.notes ?? null,
      },
      { onConflict: "user_id,check_in_date" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that check-in.");
  return data;
}
