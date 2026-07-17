import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Global library reads. RLS exposes only active rows to authenticated users;
 * libraries are maintained via migrations or the server-only admin client —
 * never through user sessions.
 */

export async function listExercises(supabase: Client): Promise<Tables<"exercise_library">[]> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error("Could not load the exercise library.");
  return data ?? [];
}

export async function getExerciseBySlug(
  supabase: Client,
  slug: string,
): Promise<Tables<"exercise_library"> | null> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Could not load that exercise.");
  return data;
}

export async function listWorkoutTemplates(
  supabase: Client,
): Promise<Tables<"workout_templates">[]> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error("Could not load the workout templates.");
  return data ?? [];
}

export async function listTemplateExercises(
  supabase: Client,
  templateId: string,
): Promise<Tables<"workout_template_exercises">[]> {
  const { data, error } = await supabase
    .from("workout_template_exercises")
    .select("*")
    .eq("template_id", templateId)
    .order("sequence_number", { ascending: true });
  if (error) throw new Error("Could not load that workout.");
  return data ?? [];
}

export async function listMealTemplates(supabase: Client): Promise<Tables<"meal_templates">[]> {
  const { data, error } = await supabase
    .from("meal_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error("Could not load the meal library.");
  return data ?? [];
}
