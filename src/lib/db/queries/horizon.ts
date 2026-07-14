import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { HorizonStepInput } from "@/types/horizon";

type Client = SupabaseClient<Database>;

export async function listHorizonSteps(
  supabase: Client,
  userId: string,
): Promise<Tables<"horizon_steps">[]> {
  const { data, error } = await supabase
    .from("horizon_steps")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your horizon.");
  return data ?? [];
}

export async function createHorizonStep(
  supabase: Client,
  userId: string,
  input: HorizonStepInput,
): Promise<Tables<"horizon_steps">> {
  const { data, error } = await supabase
    .from("horizon_steps")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      estimated_minutes: input.estimatedMinutes,
      conversation_id: input.conversationId ?? null,
      arrival_id: input.arrivalId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that step.");
  return data;
}

/** completed_at is maintained by a database trigger. */
export async function setHorizonStepCompleted(
  supabase: Client,
  userId: string,
  stepId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("horizon_steps")
    .update({ completed })
    .eq("id", stepId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that step.");
}

export async function deleteAllHorizonSteps(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("horizon_steps").delete().eq("user_id", userId);
  if (error) throw new Error("Could not delete your horizon steps.");
}
