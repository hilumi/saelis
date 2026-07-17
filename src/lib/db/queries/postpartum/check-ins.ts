import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { PostpartumCheckInInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

/** RESTORE ONLY — see profile.ts header for the isolation rules. */

async function requireActiveRestoreEnrollment(
  supabase: Client,
  userId: string,
  enrollmentId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("wellness_enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("user_id", userId)
    .eq("pathway_key", "restore")
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) throw new Error("Restore is not active for this account.");
}

export async function getPostpartumCheckIn(
  supabase: Client,
  userId: string,
  checkInDate: string,
): Promise<Tables<"postpartum_check_ins"> | null> {
  const { data, error } = await supabase
    .from("postpartum_check_ins")
    .select("*")
    .eq("user_id", userId)
    .eq("check_in_date", checkInDate)
    .maybeSingle();
  if (error) throw new Error("Could not load that check-in.");
  return data;
}

export async function listRecentPostpartumCheckIns(
  supabase: Client,
  userId: string,
  limit = 14,
): Promise<Tables<"postpartum_check_ins">[]> {
  const { data, error } = await supabase
    .from("postpartum_check_ins")
    .select("*")
    .eq("user_id", userId)
    .order("check_in_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load your check-ins.");
  return data ?? [];
}

export async function upsertPostpartumCheckIn(
  supabase: Client,
  userId: string,
  input: PostpartumCheckInInput,
): Promise<Tables<"postpartum_check_ins">> {
  await requireActiveRestoreEnrollment(supabase, userId, input.enrollmentId);
  const { data, error } = await supabase
    .from("postpartum_check_ins")
    .upsert(
      {
        user_id: userId,
        enrollment_id: input.enrollmentId,
        check_in_date: input.checkInDate,
        bleeding_concern: input.bleedingConcern,
        heavy_bleeding: input.heavyBleeding,
        incision_concern: input.incisionConcern,
        pelvic_heaviness_or_pressure: input.pelvicHeavinessOrPressure,
        urinary_or_bowel_symptom: input.urinaryOrBowelSymptom,
        calf_pain_or_swelling: input.calfPainOrSwelling,
        severe_abdominal_or_pelvic_pain: input.severeAbdominalOrPelvicPain,
        breast_or_feeding_concern: input.breastOrFeedingConcern,
        doming_or_coning: input.domingOrConing,
        notes: input.notes ?? null,
      },
      { onConflict: "user_id,check_in_date" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that check-in.");
  return data;
}
