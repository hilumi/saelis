import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { MilestoneInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export async function listMilestones(
  supabase: Client,
  userId: string,
): Promise<Tables<"wellness_milestones">[]> {
  const { data, error } = await supabase
    .from("wellness_milestones")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false });
  if (error) throw new Error("Could not load your milestones.");
  return data ?? [];
}

/**
 * Records a milestone idempotently — the (user, milestone_key) unique
 * constraint means celebrating twice is impossible.
 */
export async function recordMilestone(
  supabase: Client,
  userId: string,
  input: MilestoneInput,
): Promise<Tables<"wellness_milestones"> | null> {
  const { data, error } = await supabase
    .from("wellness_milestones")
    .upsert(
      {
        user_id: userId,
        pathway_key: input.pathwayKey ?? null,
        milestone_key: input.milestoneKey,
        milestone_type: input.milestoneType,
        numeric_value: input.numericValue ?? null,
        celebration_message: input.celebrationMessage ?? null,
      },
      { onConflict: "user_id,milestone_key", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  if (error) throw new Error("Could not record that milestone.");
  return data;
}
