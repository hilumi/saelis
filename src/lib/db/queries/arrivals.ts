import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { ArrivalInput } from "@/types/arrival";

type Client = SupabaseClient<Database>;

export async function createArrival(
  supabase: Client,
  userId: string,
  input: ArrivalInput,
): Promise<Tables<"arrivals">> {
  const { data, error } = await supabase
    .from("arrivals")
    .insert({
      user_id: userId,
      mood: input.mood,
      energy: input.energy,
      support_need: input.supportNeed,
      message: input.message,
      include_faith_reflection: input.includeFaithReflection,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save your arrival.");
  return data;
}

export async function listRecentArrivals(
  supabase: Client,
  userId: string,
  limit = 20,
): Promise<Tables<"arrivals">[]> {
  const { data, error } = await supabase
    .from("arrivals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load your arrivals.");
  return data ?? [];
}

export async function deleteAllArrivals(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("arrivals").delete().eq("user_id", userId);
  if (error) throw new Error("Could not delete your arrivals.");
}
