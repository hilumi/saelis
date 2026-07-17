import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Daily rollup persistence (Phase 6). SERVER-ONLY; deny-by-default table.
 * Upserts on the composite primary key make reruns idempotent — a repeated
 * rollup for the same day REPLACES that day's metrics, never duplicates them.
 */

export async function upsertDailyRollups(
  admin: Client,
  rows: TablesInsert<"analytics_daily_rollups">[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await admin
    .from("analytics_daily_rollups")
    .upsert(rows, { onConflict: "rollup_date,metric_key,dimension_key,dimension_value" });
  if (error) throw new Error("Rollup write failed.");
}

export async function listRollups(
  admin: Client,
  range: { fromDate: string; toDate: string },
  metricKeys?: string[],
): Promise<Tables<"analytics_daily_rollups">[]> {
  let query = admin
    .from("analytics_daily_rollups")
    .select("*")
    .gte("rollup_date", range.fromDate)
    .lte("rollup_date", range.toDate)
    .order("rollup_date", { ascending: true });
  if (metricKeys && metricKeys.length > 0) query = query.in("metric_key", metricKeys);
  const { data, error } = await query;
  if (error) throw new Error("Rollups are unavailable.");
  return data ?? [];
}
