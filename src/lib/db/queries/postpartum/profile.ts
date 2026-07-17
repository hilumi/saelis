import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { PostpartumProfileInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

/**
 * RESTORE ONLY — postpartum data services (see CLAUDE.md, "Restore isolation").
 *
 * These modules are the only code allowed to touch postpartum tables. Every
 * write verifies the user's own ACTIVE Restore enrollment at the service
 * layer, and RLS enforces the same check again in the database. Nothing in
 * here is ever logged; errors are calm and content-free.
 */

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

export async function getPostpartumProfile(
  supabase: Client,
  userId: string,
): Promise<Tables<"postpartum_profiles"> | null> {
  const { data, error } = await supabase
    .from("postpartum_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your Restore profile.");
  return data;
}

/**
 * medical_clearance_status stores what the user REPORTS — the application
 * never infers clearance and never auto-sets 'cleared'.
 */
export async function upsertPostpartumProfile(
  supabase: Client,
  userId: string,
  input: PostpartumProfileInput,
): Promise<void> {
  await requireActiveRestoreEnrollment(supabase, userId, input.enrollmentId);
  const { error } = await supabase.from("postpartum_profiles").upsert(
    {
      user_id: userId,
      enrollment_id: input.enrollmentId,
      postpartum_stage: input.postpartumStage,
      delivery_date: input.deliveryDate ?? null,
      delivery_type: input.deliveryType ?? null,
      cesarean_count: input.cesareanCount ?? null,
      feeding_status: input.feedingStatus,
      medical_clearance_status: input.medicalClearanceStatus,
      reported_restrictions: input.reportedRestrictions ?? null,
      pelvic_floor_symptoms: input.pelvicFloorSymptoms,
      pelvic_floor_details: input.pelvicFloorDetails ?? null,
      suspected_diastasis: input.suspectedDiastasis,
      diastasis_assessed_by_professional: input.diastasisAssessedByProfessional,
      abdominal_doming_or_coning: input.abdominalDomingOrConing,
      chronic_pain: input.chronicPain,
      pain_details: input.painDetails ?? null,
      iron_deficiency_or_anemia: input.ironDeficiencyOrAnemia,
      fatigue_concern: input.fatigueConcern,
      incision_status: input.incisionStatus ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save your Restore profile.");
}

export async function deletePostpartumProfile(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("postpartum_profiles").delete().eq("user_id", userId);
  if (error) throw new Error("Could not remove your Restore profile.");
}
