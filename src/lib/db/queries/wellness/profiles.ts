import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { WomenWellnessProfileInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export async function getWomenWellnessProfile(
  supabase: Client,
  userId: string,
): Promise<Tables<"women_wellness_profiles"> | null> {
  const { data, error } = await supabase
    .from("women_wellness_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your wellness profile.");
  return data;
}

/**
 * Creates or updates the opt-in Her profile. Weight and calorie fields are
 * optional by product rule and may always be null.
 */
export async function upsertWomenWellnessProfile(
  supabase: Client,
  userId: string,
  input: WomenWellnessProfileInput,
): Promise<void> {
  const { error } = await supabase.from("women_wellness_profiles").upsert(
    {
      user_id: userId,
      date_of_birth: input.dateOfBirth ?? null,
      height_inches: input.heightInches ?? null,
      current_weight_lbs: input.currentWeightLbs ?? null,
      target_weight_lbs: input.targetWeightLbs ?? null,
      desired_weight_change_lbs: input.desiredWeightChangeLbs ?? null,
      goal_timeframe_months: input.goalTimeframeMonths ?? null,
      movement_experience: input.movementExperience,
      preferred_training_locations: input.preferredTrainingLocations,
      available_equipment: input.availableEquipment,
      preferred_workout_days: input.preferredWorkoutDays,
      preferred_workout_minutes: input.preferredWorkoutMinutes,
      average_daily_steps: input.averageDailySteps ?? null,
      dietary_pattern: input.dietaryPattern ?? null,
      food_allergies: input.foodAllergies,
      food_dislikes: input.foodDislikes,
      household_meal_preferences: input.householdMealPreferences ?? null,
      budget_preference: input.budgetPreference ?? null,
      meal_prep_preference: input.mealPrepPreference ?? null,
      tracks_calories: input.tracksCalories,
      tracks_weight: input.tracksWeight,
      weighs_daily: input.weighsDaily,
      cycle_tracking_enabled: input.cycleTrackingEnabled,
      postpartum_pathway_relevant: input.postpartumPathwayRelevant,
      notification_style: input.notificationStyle,
      units_preference: input.unitsPreference,
      movement_limitations: input.movementLimitations,
      movement_dislikes: input.movementDislikes,
      floor_transitions_difficult: input.floorTransitionsDifficult,
      prefers_beginner_explanations: input.prefersBeginnerExplanations,
      quick_meals_preferred: input.quickMealsPreferred,
      protein_familiarity: input.proteinFamiliarity ?? null,
      portion_guidance_preferred: input.portionGuidancePreferred,
      family_style_meals: input.familyStyleMeals,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save your wellness profile.");
}

export async function deleteWomenWellnessProfile(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("women_wellness_profiles").delete().eq("user_id", userId);
  if (error) throw new Error("Could not remove your wellness profile.");
}
