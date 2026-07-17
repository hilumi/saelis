import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { WellnessGoalInput } from "@/lib/validation/wellness";
import type { GoalStatus } from "@/lib/wellness/constants";

type Client = SupabaseClient<Database>;

export async function listGoals(
  supabase: Client,
  userId: string,
): Promise<Tables<"wellness_goals">[]> {
  const { data, error } = await supabase
    .from("wellness_goals")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load your goals.");
  return data ?? [];
}

export async function createGoal(
  supabase: Client,
  userId: string,
  input: WellnessGoalInput,
): Promise<Tables<"wellness_goals">> {
  const { data, error } = await supabase
    .from("wellness_goals")
    .insert({
      user_id: userId,
      enrollment_id: input.enrollmentId ?? null,
      pathway_key: input.pathwayKey ?? null,
      goal_type: input.goalType,
      target_numeric: input.targetNumeric ?? null,
      target_unit: input.targetUnit ?? null,
      target_date: input.targetDate ?? null,
      priority: input.priority,
      status: input.status,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that goal.");
  return data;
}

export async function setGoalStatus(
  supabase: Client,
  userId: string,
  goalId: string,
  status: GoalStatus,
): Promise<void> {
  const { error } = await supabase
    .from("wellness_goals")
    .update({ status })
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that goal.");
}

export async function deleteGoal(supabase: Client, userId: string, goalId: string): Promise<void> {
  const { error } = await supabase
    .from("wellness_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not remove that goal.");
}
