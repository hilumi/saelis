import { NextResponse, type NextRequest } from "next/server";

import { analyticsFlags } from "@/lib/analytics/config";
import { runDailyAnalyticsRollup } from "@/lib/analytics/rollup";

/**
 * Saelis Her — daily analytics rollup trigger (Phase 6).
 *
 * POST /api/cron/analytics-rollup            → roll up yesterday (UTC)
 * POST /api/cron/analytics-rollup?date=YYYY-MM-DD → backfill one day
 *
 * Authorization: `Authorization: Bearer ${CRON_SECRET}` — the route is
 * disabled (503) until CRON_SECRET is configured, and NOTHING runs
 * automatically: an external scheduler must call it explicitly (see
 * docs/admin-analytics.md). Reruns are idempotent (upsert), so retries and
 * late-event backfills are safe. The service-role key never leaves the
 * server; this route returns only counts.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "rollups not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!analyticsFlags().rollupsEnabled) {
    return NextResponse.json({ error: "rollups disabled" }, { status: 503 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const result = await runDailyAnalyticsRollup(dateParam ?? undefined);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
