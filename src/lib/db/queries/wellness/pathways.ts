import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Saelis Her queries follow the repository pattern: they take the
 * request-scoped, RLS-enforced client plus the server-derived user id, return
 * typed results, and re-throw calm, content-free errors. Sensitive wellness
 * values are never logged.
 */

/** Active global pathways (RLS exposes active rows only). */
export async function listPathwayRows(supabase: Client): Promise<Tables<"wellness_pathways">[]> {
  const { data, error } = await supabase
    .from("wellness_pathways")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Could not load the wellness pathways.");
  return data ?? [];
}
