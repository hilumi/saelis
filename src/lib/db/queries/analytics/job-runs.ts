import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Operational job-run reads (Phase 6). SERVER-ONLY; deny-by-default table.
 * Rows contain job keys, statuses, counters, and broad error categories only.
 */

export async function listRecentJobRuns(
  admin: Client,
  limit = 50,
): Promise<Tables<"analytics_job_runs">[]> {
  const { data, error } = await admin
    .from("analytics_job_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(Math.min(limit, 200));
  if (error) throw new Error("Job runs are unavailable.");
  return data ?? [];
}
