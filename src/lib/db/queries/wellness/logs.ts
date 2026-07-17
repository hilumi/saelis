import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type {
  ExerciseLogInput,
  NutritionLogInput,
  WorkoutLogInput,
} from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export async function listWorkoutLogs(
  supabase: Client,
  userId: string,
  limit = 30,
): Promise<Tables<"wellness_workout_logs">[]> {
  const { data, error } = await supabase
    .from("wellness_workout_logs")
    .select("*")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load your workouts.");
  return data ?? [];
}

export async function createWorkoutLog(
  supabase: Client,
  userId: string,
  input: WorkoutLogInput,
): Promise<Tables<"wellness_workout_logs">> {
  const { data, error } = await supabase
    .from("wellness_workout_logs")
    .insert({
      user_id: userId,
      daily_plan_id: input.dailyPlanId ?? null,
      workout_date: input.workoutDate,
      pathway_keys: input.pathwayKeys,
      workout_type: input.workoutType,
      title: input.title,
      source: input.source,
      planned_duration_minutes: input.plannedDurationMinutes ?? null,
      actual_duration_minutes: input.actualDurationMinutes ?? null,
      completion_status: input.completionStatus,
      perceived_exertion: input.perceivedExertion ?? null,
      pain_during: input.painDuring,
      doming_or_coning: input.domingOrConing,
      pelvic_floor_symptom: input.pelvicFloorSymptom,
      notes: input.notes ?? null,
      completed_at: input.completionStatus === "completed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that workout.");
  return data;
}

/**
 * Adds exercise entries to a workout log the user owns. Ownership is checked
 * here and enforced again by RLS through the parent log.
 */
export async function addExerciseLogs(
  supabase: Client,
  userId: string,
  workoutLogId: string,
  entries: ExerciseLogInput[],
): Promise<void> {
  const { data: parent, error: parentError } = await supabase
    .from("wellness_workout_logs")
    .select("id")
    .eq("id", workoutLogId)
    .eq("user_id", userId)
    .maybeSingle();
  if (parentError || !parent) throw new Error("Could not save those exercises.");

  const { error } = await supabase.from("wellness_exercise_logs").insert(
    entries.map((entry) => ({
      workout_log_id: workoutLogId,
      exercise_id: entry.exerciseId ?? null,
      exercise_name: entry.exerciseName,
      sequence_number: entry.sequenceNumber,
      sets_completed: entry.setsCompleted ?? null,
      reps_completed: entry.repsCompleted ?? null,
      weight_used_lbs: entry.weightUsedLbs ?? null,
      duration_seconds: entry.durationSeconds ?? null,
      distance: entry.distance ?? null,
      modification_used: entry.modificationUsed ?? null,
      notes: entry.notes ?? null,
    })),
  );
  if (error) throw new Error("Could not save those exercises.");
}

export async function listExerciseLogs(
  supabase: Client,
  userId: string,
  workoutLogId: string,
): Promise<Tables<"wellness_exercise_logs">[]> {
  const { data: parent, error: parentError } = await supabase
    .from("wellness_workout_logs")
    .select("id")
    .eq("id", workoutLogId)
    .eq("user_id", userId)
    .maybeSingle();
  if (parentError || !parent) throw new Error("Could not load that workout.");

  const { data, error } = await supabase
    .from("wellness_exercise_logs")
    .select("*")
    .eq("workout_log_id", workoutLogId)
    .order("sequence_number", { ascending: true });
  if (error) throw new Error("Could not load that workout.");
  return data ?? [];
}

export async function listNutritionLogs(
  supabase: Client,
  userId: string,
  logDate: string,
): Promise<Tables<"wellness_nutrition_logs">[]> {
  const { data, error } = await supabase
    .from("wellness_nutrition_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load your food log.");
  return data ?? [];
}

export async function createNutritionLog(
  supabase: Client,
  userId: string,
  input: NutritionLogInput,
): Promise<Tables<"wellness_nutrition_logs">> {
  const { data, error } = await supabase
    .from("wellness_nutrition_logs")
    .insert({
      user_id: userId,
      log_date: input.logDate,
      meal_type: input.mealType,
      description: input.description,
      estimated_calories: input.estimatedCalories ?? null,
      protein_grams: input.proteinGrams ?? null,
      carbohydrates_grams: input.carbohydratesGrams ?? null,
      fat_grams: input.fatGrams ?? null,
      fiber_grams: input.fiberGrams ?? null,
      iron_rich: input.ironRich,
      fruit_or_vegetable_servings: input.fruitOrVegetableServings ?? null,
      logged_via: input.loggedVia,
      estimation_notice: input.estimationNotice,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that entry.");
  return data;
}
