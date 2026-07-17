import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import {
  dailyPlanSchema,
  hydrationPlanSchema,
  movementPlanSchema,
  nutritionPlanSchema,
  postpartumPlanSchema,
  readinessSnapshotSchema,
  recoveryPlanSchema,
  type DailyPlanInput,
  type HydrationPlan,
  type MovementPlan,
  type NutritionPlan,
  type PostpartumPlan,
  type ReadinessSnapshot,
  type RecoveryPlan,
} from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

/** A daily plan whose JSONB payloads have been Zod-validated. */
export interface ValidatedDailyPlan {
  row: Tables<"wellness_daily_plans">;
  movementPlan: MovementPlan;
  nutritionPlan: NutritionPlan;
  hydrationPlan: HydrationPlan;
  recoveryPlan: RecoveryPlan;
  /** Present only for Restore users; null for everyone else. */
  postpartumPlan: PostpartumPlan | null;
  readinessSnapshot: ReadinessSnapshot | null;
}

/**
 * Validates all JSONB payloads before anything reaches a component. A plan
 * that fails validation is treated as unreadable — calm error, no partial
 * unchecked data, nothing sensitive logged.
 */
function validatePlanRow(row: Tables<"wellness_daily_plans">): ValidatedDailyPlan {
  const movement = movementPlanSchema.safeParse(row.movement_plan ?? {});
  const nutrition = nutritionPlanSchema.safeParse(row.nutrition_plan ?? {});
  const hydration = hydrationPlanSchema.safeParse(row.hydration_plan ?? {});
  const recovery = recoveryPlanSchema.safeParse(row.recovery_plan ?? {});
  if (!movement.success || !nutrition.success || !hydration.success || !recovery.success) {
    throw new Error("Could not read that plan.");
  }
  let postpartum: PostpartumPlan | null = null;
  if (row.postpartum_plan !== null && row.postpartum_plan !== undefined) {
    const parsed = postpartumPlanSchema.safeParse(row.postpartum_plan);
    if (!parsed.success) throw new Error("Could not read that plan.");
    postpartum = parsed.data;
  }
  let readiness: ReadinessSnapshot | null = null;
  if (row.readiness_snapshot !== null && row.readiness_snapshot !== undefined) {
    const parsed = readinessSnapshotSchema.safeParse(row.readiness_snapshot);
    if (!parsed.success) throw new Error("Could not read that plan.");
    readiness = parsed.data;
  }
  return {
    row,
    movementPlan: movement.data,
    nutritionPlan: nutrition.data,
    hydrationPlan: hydration.data,
    recoveryPlan: recovery.data,
    postpartumPlan: postpartum,
    readinessSnapshot: readiness,
  };
}

export async function getDailyPlan(
  supabase: Client,
  userId: string,
  planDate: string,
): Promise<ValidatedDailyPlan | null> {
  const { data, error } = await supabase
    .from("wellness_daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (error) throw new Error("Could not load that plan.");
  return data ? validatePlanRow(data) : null;
}

/**
 * Writes a daily plan. Input is Zod-validated (including every JSONB payload)
 * before anything is sent to the database. One plan per user per date.
 */
export async function upsertDailyPlan(
  supabase: Client,
  userId: string,
  input: DailyPlanInput,
): Promise<ValidatedDailyPlan> {
  const parsed = dailyPlanSchema.parse(input);
  const { data, error } = await supabase
    .from("wellness_daily_plans")
    .upsert(
      {
        user_id: userId,
        plan_date: parsed.planDate,
        program_week_id: parsed.programWeekId ?? null,
        active_pathway_keys: parsed.activePathwayKeys,
        readiness_snapshot: parsed.readinessSnapshot ?? null,
        plan_status: parsed.planStatus,
        movement_plan: parsed.movementPlan,
        nutrition_plan: parsed.nutritionPlan,
        hydration_plan: parsed.hydrationPlan,
        recovery_plan: parsed.recoveryPlan,
        postpartum_plan: parsed.postpartumPlan ?? null,
        adaptation_level: parsed.adaptationLevel,
        adaptation_reason: parsed.adaptationReason ?? null,
        safety_message: parsed.safetyMessage ?? null,
        generated_by: parsed.generatedBy,
      },
      { onConflict: "user_id,plan_date" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that plan.");
  return validatePlanRow(data);
}
