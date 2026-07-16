import type { SupabaseClient } from "@supabase/supabase-js";

import { APP_VERSION } from "@/lib/version";

import type { Database, TablesInsert } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Privacy-safe stewardship telemetry. The table schema IS the allowlist —
 * there is no freeform metadata column, and no content field exists. Events
 * are recorded only when the user's privacy settings allow product analytics
 * (checked by callers). Failures are swallowed: telemetry must never break
 * the experience.
 */
export type StewardshipEventInput = Omit<
  TablesInsert<"stewardship_events">,
  "user_id" | "app_version"
>;

export async function recordStewardshipEvent(
  supabase: Client,
  userId: string,
  event: StewardshipEventInput,
): Promise<void> {
  try {
    await supabase
      .from("stewardship_events")
      .insert({ ...event, user_id: userId, app_version: APP_VERSION });
  } catch {
    // Never let telemetry interfere with the product.
  }
}

/** Founder-only aggregates (authorization enforced inside the database). */
export async function getStewardshipEventCounts(
  supabase: Client,
): Promise<Array<{ event_type: string; occurrences: number }>> {
  const { data, error } = await supabase.rpc("stewardship_event_counts", { days: 30 });
  if (error) throw new Error("Aggregates unavailable.");
  return data ?? [];
}

export async function getStewardshipMemoryCounts(
  supabase: Client,
): Promise<Array<{ kind: string; status: string; occurrences: number }>> {
  const { data, error } = await supabase.rpc("stewardship_memory_counts");
  if (error) throw new Error("Aggregates unavailable.");
  return data ?? [];
}

/** Founder-only "Not quite" category counts (30 days). Counts only. */
export async function getFeedbackCategoryCounts(
  supabase: Client,
): Promise<Array<{ feedback_category: string; occurrences: number }>> {
  const { data, error } = await supabase.rpc("feedback_category_counts", { days: 30 });
  if (error) throw new Error("Aggregates unavailable.");
  return data ?? [];
}
