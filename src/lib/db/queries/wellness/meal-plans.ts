import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import { mealPlanDataSchema, type MealPlanInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export interface ValidatedMealPlan {
  row: Tables<"wellness_meal_plans">;
  planData: MealPlanInput["planData"];
}

function validate(row: Tables<"wellness_meal_plans">): ValidatedMealPlan {
  const parsed = mealPlanDataSchema.safeParse(row.plan_data);
  if (!parsed.success) throw new Error("Could not read that meal plan.");
  return { row, planData: parsed.data };
}

export async function getMealPlan(
  supabase: Client,
  userId: string,
  weekStartDate: string,
): Promise<ValidatedMealPlan | null> {
  const { data, error } = await supabase
    .from("wellness_meal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw new Error("Could not load your meal plan.");
  return data ? validate(data) : null;
}

export async function upsertMealPlan(
  supabase: Client,
  userId: string,
  input: MealPlanInput,
): Promise<ValidatedMealPlan> {
  const { data, error } = await supabase
    .from("wellness_meal_plans")
    .upsert(
      {
        user_id: userId,
        week_start_date: input.weekStartDate,
        active_pathway_keys: input.activePathwayKeys,
        calorie_target: input.calorieTarget ?? null,
        calorie_range_low: input.calorieRangeLow ?? null,
        calorie_range_high: input.calorieRangeHigh ?? null,
        protein_target_grams: input.proteinTargetGrams ?? null,
        hydration_target_ounces: input.hydrationTargetOunces ?? null,
        plan_data: input.planData,
        generated_by: input.generatedBy,
      },
      { onConflict: "user_id,week_start_date" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save your meal plan.");
  return validate(data);
}
