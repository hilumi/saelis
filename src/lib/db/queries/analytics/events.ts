import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { AnalyticsEventLite } from "@/lib/analytics/metrics";

type Client = SupabaseClient<Database>;

/**
 * Analytics event reads (Phase 6). SERVER-ONLY: the analytics tables are
 * deny-by-default, so the caller must pass the service-role client — and must
 * have verified admin authorization FIRST (requireAdminAccess). Only the
 * minimized column set ever leaves the database; raw metadata stays coarse by
 * construction and user ids are used solely for distinct counting.
 */

const PAGE_SIZE = 1000;
/** Hard cap so an admin query can never load unbounded history into memory. */
const MAX_ROWS = 50_000;

export async function listAnalyticsEvents(
  admin: Client,
  range: { fromISO: string; toISO: string },
): Promise<AnalyticsEventLite[]> {
  const rows: AnalyticsEventLite[] = [];
  for (let page = 0; page * PAGE_SIZE < MAX_ROWS; page += 1) {
    const { data, error } = await admin
      .from("analytics_events")
      .select("event_name, occurred_at, user_id, pathway_keys, metadata")
      .gte("occurred_at", range.fromISO)
      .lt("occurred_at", range.toISO)
      .order("occurred_at", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error("Analytics events are unavailable.");
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Daily ingestion volume (count per UTC day) for the operations view. */
export async function countEventsPerDay(
  admin: Client,
  range: { fromISO: string; toISO: string },
): Promise<Array<{ date: string; count: number }>> {
  const events = await listAnalyticsEvents(admin, range);
  const byDay = new Map<string, number>();
  for (const event of events) {
    const day = event.occurred_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
